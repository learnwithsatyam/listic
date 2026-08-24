import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sharp from 'sharp';

/**
 * Negative instruction appended to every Gemini image prompt so the model does
 * not paint a badge, caption or signature into the picture in the first place.
 * Prompt-level suppression is the cheapest and least destructive defence — the
 * pixel-level pass below only exists as a backstop.
 */
export const NO_WATERMARK_INSTRUCTION =
  'Do not add any watermark, logo, brand mark, signature, caption, label, sticker, ' +
  'badge, timestamp, border or frame, and do not render any text of any kind anywhere ' +
  'in the image. Output the bare photograph only, edge to edge.';

@Injectable()
export class WatermarkService {
  private readonly logger = new Logger(WatermarkService.name);

  /** Percentage of each edge to shave off. 0 disables the crop. */
  private readonly edgeCropPercent: number;

  constructor(private readonly config: ConfigService) {
    const raw = Number(this.config.get<string>('WATERMARK_EDGE_CROP_PERCENT', '2.5'));
    this.edgeCropPercent = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 10) : 2.5;
  }

  /**
   * Strip generator branding from a freshly generated image.
   *
   * 1. Re-encodes the pixels, which drops every metadata block sharp does not
   *    explicitly carry over — EXIF, XMP and the C2PA/provenance tags Google
   *    attaches to Gemini output. Nothing in the file says "AI generated".
   * 2. Shaves a thin margin off all four edges. Generator badges are always
   *    corner-anchored, so a uniform trim removes them whichever corner they
   *    land in, without needing to detect the badge. Callers resize to their
   *    target dimensions afterwards, so the crop costs no framing.
   *
   * Note: this does not touch Google's SynthID signal, which is encoded into
   * the pixels themselves and is invisible to the viewer. Nothing visible or
   * readable identifies the image as Gemini output after this pass.
   */
  async sanitize(input: Buffer): Promise<Buffer> {
    try {
      const image = sharp(input);
      const meta = await image.metadata();
      const width = meta.width ?? 0;
      const height = meta.height ?? 0;

      if (this.edgeCropPercent <= 0 || width < 64 || height < 64) {
        // Re-encode only — still drops the provenance metadata.
        return await sharp(input).png({ compressionLevel: 6 }).toBuffer();
      }

      const insetX = Math.round((width * this.edgeCropPercent) / 100);
      const insetY = Math.round((height * this.edgeCropPercent) / 100);

      return await sharp(input)
        .extract({
          left: insetX,
          top: insetY,
          width: width - insetX * 2,
          height: height - insetY * 2,
        })
        .png({ compressionLevel: 6 })
        .toBuffer();
    } catch (err) {
      this.logger.warn(`Watermark sanitize failed, using original image: ${err}`);
      return input;
    }
  }

  /** Convenience wrapper for the `data:` URIs the Gemini client returns. */
  async sanitizeDataUri(dataUri: string): Promise<Buffer> {
    const match = dataUri.match(/^data:[^;]+;base64,(.+)$/);
    if (!match) throw new Error('Invalid data URI');
    return this.sanitize(Buffer.from(match[1], 'base64'));
  }
}
