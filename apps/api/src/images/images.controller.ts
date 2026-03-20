import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ImagesService } from './images.service';
import { CreateProjectDto, GenerateImagesDto } from './dto/images.dto';

@Controller('images')
@UseGuards(JwtAuthGuard)
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post('projects')
  @UseInterceptors(FileInterceptor('image'))
  createProject(
    @Req() req: any,
    @Body() dto: CreateProjectDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.imagesService.createProject(req.user.userId, dto, file);
  }

  @Post('generate')
  generateImages(@Req() req: any, @Body() dto: GenerateImagesDto) {
    return this.imagesService.generateImages(
      req.user.userId,
      dto.projectId,
      dto.additionalPrompt,
    );
  }

  @Get('projects')
  getUserProjects(@Req() req: any) {
    return this.imagesService.getUserProjects(req.user.userId);
  }

  @Get('projects/:id')
  getProject(@Req() req: any, @Param('id') id: string) {
    return this.imagesService.getProject(req.user.userId, id);
  }
}
