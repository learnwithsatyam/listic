import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImageProject, GeneratedImage } from './entities/image-project.entity';
import { ImagenService } from './imagen.service';
import { StorageService } from '../storage/storage.service';
import { UsersService } from '../users/users.service';
import { PlatformsService } from '../platforms/platforms.service';
import { CreateProjectDto } from './dto/images.dto';

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  constructor(
    @InjectRepository(ImageProject)
    private readonly projectRepo: Repository<ImageProject>,
    @InjectRepository(GeneratedImage)
    private readonly generatedImageRepo: Repository<GeneratedImage>,
    private readonly imagenService: ImagenService,
    private readonly storageService: StorageService,
    private readonly usersService: UsersService,
    private readonly platformsService: PlatformsService,
  ) {}

  async createProject(
    userId: string,
    dto: CreateProjectDto,
    file: Express.Multer.File,
  ): Promise<ImageProject> {
    // Upload original image to Azure Blob Storage
    const originalImageUrl = await this.storageService.uploadFile(
      file,
      `originals/${userId}`,
    );

    const project = this.projectRepo.create({
      userId,
      originalImageUrl,
      productName: dto.productName,
      productCategory: dto.productCategory,
      isWearable: dto.isWearable,
      targetPlatforms: dto.targetPlatforms,
      status: 'pending',
    });

    return this.projectRepo.save(project);
  }

  async generateImages(
    userId: string,
    projectId: string,
    additionalPrompt?: string,
  ): Promise<ImageProject> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ['generatedImages'],
    });

    if (!project) throw new NotFoundException('Project not found');
    if (project.userId !== userId)
      throw new ForbiddenException('Not your project');

    // Deduct credit
    const hasCredit = await this.usersService.deductCredit(userId);
    if (!hasCredit) {
      throw new ForbiddenException('No credits remaining');
    }

    project.status = 'processing';
    await this.projectRepo.save(project);

    // Fire-and-forget: run generation in background so the endpoint returns immediately
    this.runGeneration(project, userId, additionalPrompt).catch((err) => {
      this.logger.error(`Background generation crashed: ${err}`);
    });

    return project;
  }

  private async runGeneration(
    project: ImageProject,
    userId: string,
    additionalPrompt?: string,
  ): Promise<void> {
    const imageTypes = this.getImageTypes(project.isWearable);
    const primaryPlatform = project.targetPlatforms[0] || 'amazon';

    const externalImageUrl = this.storageService.resolveExternalUrl(
      project.originalImageUrl,
    );

    try {
      for (const imageType of imageTypes) {
        const resultUrl = await this.callWithRetry(() =>
          this.imagenService.generateImage({
            originalImageUrl: externalImageUrl,
            productName: project.productName,
            productCategory: project.productCategory,
            isWearable: project.isWearable,
            imageType,
            platform: primaryPlatform,
            additionalPrompt,
          }),
        );

        const storedUrl = await this.storageService.uploadFromUrl(
          resultUrl,
          `generated/${userId}/${project.id}`,
        );

        const specs = this.platformsService.getSpecs(primaryPlatform);

        const generatedImage = this.generatedImageRepo.create({
          projectId: project.id,
          imageUrl: storedUrl,
          imageType,
          platform: primaryPlatform,
          width: specs.dimensions.width,
          height: specs.dimensions.height,
        });

        await this.generatedImageRepo.save(generatedImage);
        this.logger.log(`Generated ${imageType} image for project ${project.id}`);
      }

      await this.projectRepo.update(project.id, { status: 'completed' });
    } catch (error) {
      this.logger.error(`Image generation failed: ${error}`);
      await this.projectRepo.update(project.id, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getProject(userId: string, projectId: string): Promise<ImageProject> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ['generatedImages'],
    });

    if (!project) throw new NotFoundException('Project not found');
    if (project.userId !== userId)
      throw new ForbiddenException('Not your project');

    return project;
  }

  async getUserProjects(userId: string): Promise<ImageProject[]> {
    return this.projectRepo.find({
      where: { userId },
      relations: ['generatedImages'],
      order: { createdAt: 'DESC' },
    });
  }

  private getImageTypes(isWearable: boolean): string[] {
    const types = ['main', 'lifestyle', 'closeup', 'scale', 'angle'];
    if (isWearable) {
      types.push('model');
    } else {
      types.push('angle');
    }
    return types.slice(0, 6);
  }

  /** Retry with exponential backoff on 429 rate-limit responses. */
  private async callWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 5,
  ): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        const status = err?.response?.status ?? err?.status;
        const retryAfter = err?.response?.data?.retry_after
          ?? err?.retry_after;

        if (status === 429 && attempt < maxRetries) {
          const wait = (retryAfter ? Number(retryAfter) : 10 * (attempt + 1)) * 1000;
          this.logger.warn(
            `Rate limited (429). Retrying in ${wait / 1000}s (attempt ${attempt + 1}/${maxRetries})`,
          );
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
        throw err;
      }
    }
    throw new Error('Max retries exceeded');
  }
}
