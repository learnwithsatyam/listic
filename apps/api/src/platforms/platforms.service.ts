import { Injectable } from '@nestjs/common';
import { PLATFORM_SPECS, PlatformSpec } from './platform-specs';

@Injectable()
export class PlatformsService {
  getAllPlatforms(): PlatformSpec[] {
    return Object.values(PLATFORM_SPECS);
  }

  getSpecs(platformSlug: string): PlatformSpec {
    return PLATFORM_SPECS[platformSlug] || PLATFORM_SPECS.amazon;
  }

  getSupportedPlatformSlugs(): string[] {
    return Object.keys(PLATFORM_SPECS);
  }
}
