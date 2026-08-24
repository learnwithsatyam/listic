import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as sharp from 'sharp';
import { StudioBackground, FoodShoot, FoodShot } from './entities/studio.entity';
import { StudioAiService } from './studio-ai.service';
import { WatermarkService } from '../images/watermark.service';
import { ImageProcessingService } from '../images/image-processing.service';
import { StorageService } from '../storage/storage.service';
import { UsersService } from '../users/users.service';
import {
  UploadBackgroundDto,
  GenerateBackgroundDto,
  CreateShootDto,
} from './dto/studio.dto';
import { getStudioFormat, listStudioFormats, StudioFormat } from './studio-formats';

/** Hard cap on dishes per shoot — keeps one background job bounded. */
export const MAX_DISHES_PER_SHOOT = 12;

@Injectable()
export class StudioService {
  private readonly logger = new Logger(StudioService.name);

  constructor(
    @InjectRepository(StudioBackground)
    private readonly backgroundRepo: Repository<StudioBackground>,
    @InjectRepository(FoodShoot)
    private readonly shootRepo: Repository<FoodShoot>,
    @InjectRepository(FoodShot)
    private readonly shotRepo: Repository<FoodShot>,
    private readonly studioAi: StudioAiService,
    private readonly watermarkService: WatermarkService,
    private readonly imageProcessingService: ImageProcessingService,
    private readonly storageService: StorageService,
    private readonly usersService: UsersService,
  ) {}

  getFormats(): StudioFormat[] {
    return listStudioFormats();
  }

  // ─────────────────────────── Backgrounds ───────────────────────────

  /** Save a background the cafe owner shot or sourced themselves. */
  async uploadBackground(
    userId: string,
    dto: UploadBackgroundDto,
    file: Express.Multer.File,
  ): Promise<StudioBackground> {
    const imageUrl = await this.storageService.uploadFile(
      file,
      `studio/backgrounds/${userId}`,
    );

    const { width, height } = await this.readDimensions(file.buffer);

    return this.backgroundRepo.save(
      this.backgroundRepo.create({
        userId,
        name: dto.name.trim(),
        source: 'uploaded',
        imageUrl,
        width,
        height,
      }),
    );
  }

  /**
   * Generate a background plate from a plain-language description.
   * Costs one credit; refunded if Gemini fails so a bad call is never charged.
   */
  async generateBackground(
    userId: string,
    dto: GenerateBackgroundDto,
  ): Promise<StudioBackground> {
    const hasCredit = await this.usersService.deductCredit(userId);
    if (!hasCredit) throw new ForbiddenException('No credits remaining');

    const format = getStudioFormat(dto.format);

    try {
      const dataUri = await this.callWithRetry(() =>
        this.studioAi.generateBackground(dto.prompt.trim(), format),
      );

      const clean = await this.watermarkService.sanitizeDataUri(dataUri);
      const sized = await this.imageProcessingService.processForSocial(clean, format);

      const imageUrl = await this.storageService.uploadBuffer(
        sized,
        `studio/backgrounds/${userId}`,
        'image/png',
      );

      return this.backgroundRepo.save(
        this.backgroundRepo.create({
          userId,
          name: (dto.name || this.nameFromPrompt(dto.prompt)).trim(),
          source: 'generated',
          prompt: dto.prompt.trim(),
          imageUrl,
          width: format.width,
          height: format.height,
        }),
      );
    } catch (error) {
      await this.usersService.addCredits(userId, 1);
      this.logger.error(`Background generation failed, credit refunded: ${error}`);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Background generation failed',
      );
    }
  }

  async getBackgrounds(userId: string): Promise<StudioBackground[]> {
    return this.backgroundRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getBackground(userId: string, id: string): Promise<StudioBackground> {
    const background = await this.backgroundRepo.findOne({ where: { id } });
    if (!background) throw new NotFoundException('Background not found');
    if (background.userId !== userId)
      throw new ForbiddenException('Not your background');
    return background;
  }

  async deleteBackground(userId: string, id: string): Promise<{ deleted: true }> {
    const background = await this.getBackground(userId, id);

    const inUse = await this.shootRepo.count({ where: { backgroundId: id } });
    if (inUse > 0) {
      throw new BadRequestException(
        `This background is used by ${inUse} shoot${inUse === 1 ? '' : 's'} and cannot be deleted`,
      );
    }

    await this.backgroundRepo.delete(background.id);
    return { deleted: true };
  }

  /** Raw bytes of a background, so it can be downloaded on its own. */
  async downloadBackground(userId: string, id: string): Promise<Buffer> {
    const background = await this.getBackground(userId, id);
    return this.storageService.readAsBuffer(background.imageUrl);
  }

  // ───────────────────────────── Shoots ─────────────────────────────

  /** Register a batch of dish photos against one background. */
  async createShoot(
    userId: string,
    dto: CreateShootDto,
    files: Express.Multer.File[],
  ): Promise<FoodShoot> {
    if (!files?.length) {
      throw new BadRequestException('Upload at least one dish photo');
    }
    if (files.length > MAX_DISHES_PER_SHOOT) {
      throw new BadRequestException(
        `A shoot can hold at most ${MAX_DISHES_PER_SHOOT} dishes`,
      );
    }

    // Ownership check — throws if the background isn't theirs.
    const background = await this.getBackground(userId, dto.backgroundId);

    const shoot = await this.shootRepo.save(
      this.shootRepo.create({
        userId,
        backgroundId: background.id,
        name: dto.name.trim(),
        format: getStudioFormat(dto.format).slug,
        stylePrompt: dto.stylePrompt?.trim() || undefined,
        status: 'pending',
      }),
    );

    for (const [index, file] of files.entries()) {
      const sourceImageUrl = await this.storageService.uploadFile(
        file,
        `studio/dishes/${userId}/${shoot.id}`,
      );

      await this.shotRepo.save(
        this.shotRepo.create({
          shootId: shoot.id,
          dishName: (dto.dishNames?.[index] || `Dish ${index + 1}`).trim(),
          sourceImageUrl,
          status: 'pending',
        }),
      );
    }

    return this.getShoot(userId, shoot.id);
  }

  /**
   * Kick off composition for every pending dish. Credits for the whole batch
   * are taken up front (one per dish) and individually refunded if a dish fails.
   */
  async composeShoot(userId: string, shootId: string): Promise<FoodShoot> {
    const shoot = await this.getShoot(userId, shootId);

    if (shoot.status === 'processing') {
      throw new BadRequestException('This shoot is already being generated');
    }

    const pending = shoot.shots.filter((shot) => shot.status !== 'completed');
    if (pending.length === 0) {
      throw new BadRequestException('Every dish in this shoot is already done');
    }

    const paid = await this.usersService.deductCredits(userId, pending.length);
    if (!paid) {
      throw new ForbiddenException(
        `Not enough credits — this shoot needs ${pending.length}`,
      );
    }

    shoot.status = 'processing';
    shoot.errorMessage = null;
    await this.shootRepo.update(shoot.id, {
      status: 'processing',
      errorMessage: null,
    });

    // Fire-and-forget so the request returns immediately; the client polls.
    this.runComposition(shoot, pending).catch((err) => {
      this.logger.error(`Background composition crashed: ${err}`);
    });

    return shoot;
  }

  private async runComposition(shoot: FoodShoot, shots: FoodShot[]): Promise<void> {
    const format = getStudioFormat(shoot.format);
    let failed = 0;

    // Read the background once — every dish is composed onto the same plate.
    let backgroundDataUri: string;
    try {
      backgroundDataUri = await this.storageService.resolveExternalUrl(
        shoot.background.imageUrl,
      );
    } catch (error) {
      // Nothing ran, so the whole batch is refunded.
      const message =
        error instanceof Error ? error.message : 'Could not read the background';
      await this.usersService.addCredits(shoot.userId, shots.length);
      this.logger.error(`Shoot ${shoot.id} failed before starting: ${message}`);
      await this.shootRepo.update(shoot.id, { status: 'failed', errorMessage: message });
      return;
    }

    for (const shot of shots) {
      await this.shotRepo.update(shot.id, {
        status: 'processing',
        errorMessage: null,
      });

      try {
        const dishDataUri = await this.storageService.resolveExternalUrl(
          shot.sourceImageUrl,
        );

        const request = {
          backgroundDataUri,
          dishDataUri,
          dishName: shot.dishName,
          format,
          stylePrompt: shoot.stylePrompt,
        };

        const resultUri = await this.callWithRetry(() =>
          this.studioAi.composeDishOnBackground(request),
        );

        const clean = await this.watermarkService.sanitizeDataUri(resultUri);
        const sized = await this.imageProcessingService.processForSocial(clean, format);

        const resultImageUrl = await this.storageService.uploadBuffer(
          sized,
          `studio/shots/${shoot.userId}/${shoot.id}`,
          'image/png',
        );

        await this.shotRepo.update(shot.id, {
          resultImageUrl,
          status: 'completed',
          width: format.width,
          height: format.height,
          prompt: this.studioAi.buildComposePrompt(request),
        });

        this.logger.log(`Composed "${shot.dishName}" for shoot ${shoot.id}`);
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : 'Composition failed';
        await this.shotRepo.update(shot.id, {
          status: 'failed',
          errorMessage: message,
        });
        // Refund this dish only — the rest of the batch still stands.
        await this.usersService.addCredits(shoot.userId, 1);
        this.logger.error(`Failed to compose "${shot.dishName}": ${message}`);
      }
    }

    await this.shootRepo.update(shoot.id, {
      status: failed === shots.length ? 'failed' : 'completed',
      errorMessage: failed
        ? `${failed} of ${shots.length} dishes could not be generated`
        : null,
    });
  }

  async getShoots(userId: string): Promise<FoodShoot[]> {
    return this.shootRepo.find({
      where: { userId },
      relations: ['shots'],
      order: { createdAt: 'DESC' },
    });
  }

  async getShoot(userId: string, shootId: string): Promise<FoodShoot> {
    const shoot = await this.shootRepo.findOne({
      where: { id: shootId },
      relations: ['shots'],
    });

    if (!shoot) throw new NotFoundException('Shoot not found');
    if (shoot.userId !== userId) throw new ForbiddenException('Not your shoot');

    shoot.shots.sort((a, b) => +a.createdAt - +b.createdAt);
    return shoot;
  }

  /** Raw bytes of one composed dish photo. */
  async downloadShot(userId: string, shotId: string): Promise<Buffer> {
    const shot = await this.shotRepo.findOne({
      where: { id: shotId },
      relations: ['shoot'],
    });

    if (!shot) throw new NotFoundException('Image not found');
    if (shot.shoot.userId !== userId)
      throw new ForbiddenException('Not your image');
    if (!shot.resultImageUrl)
      throw new BadRequestException('This dish has not been generated yet');

    return this.storageService.readAsBuffer(shot.resultImageUrl);
  }

  // ───────────────────────────── Helpers ─────────────────────────────

  private async readDimensions(
    buffer: Buffer,
  ): Promise<{ width: number; height: number }> {
    try {
      const meta = await sharp(buffer).metadata();
      return { width: meta.width ?? 0, height: meta.height ?? 0 };
    } catch {
      return { width: 0, height: 0 };
    }
  }

  /** Falls back to a readable name when the user doesn't supply one. */
  private nameFromPrompt(prompt: string): string {
    const trimmed = prompt.trim().replace(/\s+/g, ' ');
    return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
  }

  /** Retry with exponential backoff on 429 rate-limit responses. */
  private async callWithRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        const status = err?.response?.status ?? err?.status;
        const retryAfter = err?.response?.data?.retry_after ?? err?.retry_after;

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
