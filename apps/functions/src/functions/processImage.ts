import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import sharp from 'sharp';

/**
 * Azure Function: Post-process generated images for platform compliance.
 * - Resize to exact platform dimensions
 * - Enforce white background
 * - Optimize file size
 */
app.http('processImage', {
  methods: ['POST'],
  authLevel: 'function',
  handler: async (
    request: HttpRequest,
    context: InvocationContext,
  ): Promise<HttpResponseInit> => {
    context.log('Processing image for compliance');

    const body = (await request.json()) as {
      imageUrl: string;
      width: number;
      height: number;
      backgroundRequirement: string;
      format: string;
    };

    try {
      const response = await fetch(body.imageUrl);
      const inputBuffer = Buffer.from(await response.arrayBuffer());

      let pipeline = sharp(inputBuffer);

      // Resize to target dimensions
      pipeline = pipeline.resize(body.width, body.height, {
        fit: 'contain',
        background:
          body.backgroundRequirement === 'white'
            ? { r: 255, g: 255, b: 255, alpha: 1 }
            : { r: 255, g: 255, b: 255, alpha: 0 },
      });

      // Convert to target format
      const format = body.format?.toLowerCase() || 'png';
      if (format === 'jpeg' || format === 'jpg') {
        pipeline = pipeline.jpeg({ quality: 95 });
      } else {
        pipeline = pipeline.png({ compressionLevel: 6 });
      }

      const outputBuffer = await pipeline.toBuffer();

      return {
        status: 200,
        headers: { 'Content-Type': `image/${format}` },
        body: outputBuffer,
      };
    } catch (error) {
      context.error('Image processing error:', error);
      return {
        status: 500,
        jsonBody: {
          error: 'Failed to process image',
        },
      };
    }
  },
});
