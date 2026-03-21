import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import { PlatformSpec } from '../platforms/platform-specs';

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  /**
   * Resize and optimize an image buffer to meet platform specs.
   * - Resize to exact platform dimensions
   * - Apply white/transparent background as required
   * - Output as PNG (preserves quality, works on all platforms)
   */
  async processForPlatform(
    inputBuffer: Buffer,
    spec: PlatformSpec,
  ): Promise<Buffer> {
    const { width, height } = spec.dimensions;
    const bg = spec.backgroundRequirement === 'white'
      ? { r: 255, g: 255, b: 255, alpha: 1 }
      : { r: 255, g: 255, b: 255, alpha: 0 };

    let pipeline = sharp(inputBuffer);

    // Resize to exact platform dimensions, fitting product inside
    pipeline = pipeline.resize(width, height, {
      fit: 'contain',
      background: bg,
    });

    // If platform requires white background, flatten with white
    if (spec.backgroundRequirement === 'white') {
      pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
    }

    // Output as PNG for maximum compatibility
    pipeline = pipeline.png({ compressionLevel: 6 });

    const outputBuffer = await pipeline.toBuffer();

    // Check file size against platform limit
    const sizeKB = outputBuffer.length / 1024;
    if (sizeKB > spec.maxFileSizeKB) {
      this.logger.warn(
        `Processed image is ${sizeKB.toFixed(0)}KB, exceeds ${spec.maxFileSizeKB}KB limit for ${spec.name}. Compressing as JPEG.`,
      );
      // Fall back to JPEG with quality reduction
      return sharp(inputBuffer)
        .resize(width, height, { fit: 'contain', background: bg })
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 85 })
        .toBuffer();
    }

    return outputBuffer;
  }
}
