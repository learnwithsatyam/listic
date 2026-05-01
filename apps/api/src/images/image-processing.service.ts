import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import { PlatformSpec } from '../platforms/platform-specs';

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  /**
   * Resize and optimize an image buffer to meet platform specs.
   * - Trim excess whitespace from the generated image
   * - Resize product to fill ~96% of the frame (narrow borders)
   * - Pad to exact platform dimensions
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

    // Trim excess whitespace so the product fills the image tightly
    const trimmed = await this.trimWhitespace(inputBuffer);

    // Resize product to fill ~96% of the target frame
    const padded = await this.resizeAndPad(trimmed, width, height, bg);

    // If platform requires white background, flatten with white
    let pipeline = sharp(padded);
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
      const fallbackPadded = await this.resizeAndPad(trimmed, width, height, bg);
      return sharp(fallbackPadded)
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 85 })
        .toBuffer();
    }

    return outputBuffer;
  }

  /** Trim surrounding whitespace from the image. */
  private async trimWhitespace(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer).trim({ threshold: 20 }).toBuffer();
    } catch {
      // trim can fail on very low-contrast images, use original
      return buffer;
    }
  }

  /** Resize to fill 96% of frame, then pad evenly to exact dimensions. */
  private async resizeAndPad(
    buffer: Buffer,
    targetWidth: number,
    targetHeight: number,
    bg: { r: number; g: number; b: number; alpha: number },
  ): Promise<Buffer> {
    const fillRatio = 0.96;
    const innerW = Math.round(targetWidth * fillRatio);
    const innerH = Math.round(targetHeight * fillRatio);

    const resized = await sharp(buffer)
      .resize(innerW, innerH, { fit: 'inside', withoutEnlargement: false })
      .toBuffer();

    const meta = await sharp(resized).metadata();
    const rw = meta.width || innerW;
    const rh = meta.height || innerH;

    const padLeft = Math.round((targetWidth - rw) / 2);
    const padTop = Math.round((targetHeight - rh) / 2);

    return sharp(resized)
      .extend({
        top: padTop,
        bottom: targetHeight - rh - padTop,
        left: padLeft,
        right: targetWidth - rw - padLeft,
        background: bg,
      })
      .toBuffer();
  }
}
