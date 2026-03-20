import { Controller, Get, Param } from '@nestjs/common';
import { PlatformsService } from './platforms.service';

@Controller('platforms')
export class PlatformsController {
  constructor(private readonly platformsService: PlatformsService) {}

  @Get()
  getAll() {
    return this.platformsService.getAllPlatforms();
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.platformsService.getSpecs(slug);
  }
}
