import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StudioService, MAX_DISHES_PER_SHOOT } from './studio.service';
import {
  UploadBackgroundDto,
  GenerateBackgroundDto,
  CreateShootDto,
} from './dto/studio.dto';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_MIME = /^image\/(jpeg|png|webp)$/;

/** Food photo studio: consistent backgrounds for a cafe's Instagram grid. */
@Controller('studio')
@UseGuards(JwtAuthGuard)
export class StudioController {
  constructor(private readonly studioService: StudioService) {}

  @Get('formats')
  getFormats() {
    return this.studioService.getFormats();
  }

  // ─────────────────────────── Backgrounds ───────────────────────────

  @Post('backgrounds/upload')
  @UseInterceptors(FileInterceptor('image'))
  uploadBackground(
    @Req() req: any,
    @Body() dto: UploadBackgroundDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_IMAGE_BYTES }),
          new FileTypeValidator({ fileType: IMAGE_MIME }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.studioService.uploadBackground(req.user.userId, dto, file);
  }

  @Post('backgrounds/generate')
  generateBackground(@Req() req: any, @Body() dto: GenerateBackgroundDto) {
    return this.studioService.generateBackground(req.user.userId, dto);
  }

  @Get('backgrounds')
  getBackgrounds(@Req() req: any) {
    return this.studioService.getBackgrounds(req.user.userId);
  }

  @Get('backgrounds/:id')
  getBackground(@Req() req: any, @Param('id') id: string) {
    return this.studioService.getBackground(req.user.userId, id);
  }

  @Delete('backgrounds/:id')
  deleteBackground(@Req() req: any, @Param('id') id: string) {
    return this.studioService.deleteBackground(req.user.userId, id);
  }

  /** Download the background on its own, without any dish composed onto it. */
  @Get('backgrounds/:id/download')
  async downloadBackground(
    @Req() req: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.studioService.downloadBackground(req.user.userId, id);
    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="listic_background_${id}.png"`,
    });
    res.send(buffer);
  }

  // ───────────────────────────── Shoots ─────────────────────────────

  @Post('shoots')
  @UseInterceptors(FilesInterceptor('images', MAX_DISHES_PER_SHOOT))
  createShoot(
    @Req() req: any,
    @Body() dto: CreateShootDto,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_IMAGE_BYTES }),
          new FileTypeValidator({ fileType: IMAGE_MIME }),
        ],
      }),
    )
    files: Express.Multer.File[],
  ) {
    return this.studioService.createShoot(req.user.userId, dto, files);
  }

  @Post('shoots/:id/compose')
  composeShoot(@Req() req: any, @Param('id') id: string) {
    return this.studioService.composeShoot(req.user.userId, id);
  }

  @Get('shoots')
  getShoots(@Req() req: any) {
    return this.studioService.getShoots(req.user.userId);
  }

  @Get('shoots/:id')
  getShoot(@Req() req: any, @Param('id') id: string) {
    return this.studioService.getShoot(req.user.userId, id);
  }

  @Get('shots/:id/download')
  async downloadShot(
    @Req() req: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.studioService.downloadShot(req.user.userId, id);
    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="listic_dish_${id}.png"`,
    });
    res.send(buffer);
  }
}
