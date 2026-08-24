import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContainerClient } from '@azure/storage-blob';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

/** Which Azure container to target */
export type StorageBucket = 'originals' | 'generated';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly useLocal: boolean;
  private readonly localDir: string;
  private readonly port: string;

  /** Per-container clients built from individual SAS URLs */
  private readonly containerClients: Partial<Record<StorageBucket, ContainerClient>> = {};

  constructor(private readonly config: ConfigService) {
    const originalsSasUrl = this.config.get<string>('AZURE_SAS_URL_ORIGINALS', '');
    const generatedSasUrl = this.config.get<string>('AZURE_SAS_URL_GENERATED', '');

    if (originalsSasUrl && generatedSasUrl) {
      this.containerClients.originals = new ContainerClient(originalsSasUrl);
      this.containerClients.generated = new ContainerClient(generatedSasUrl);
      this.useLocal = false;
      this.logger.log('Using Azure Blob Storage (per-container SAS URLs)');
    } else {
      this.useLocal = true;
      if (!originalsSasUrl && !generatedSasUrl) {
        this.logger.warn(
          'No Azure Storage SAS URLs set — using local filesystem storage',
        );
      } else {
        this.logger.warn(
          'Only one Azure SAS URL set — both AZURE_SAS_URL_ORIGINALS and AZURE_SAS_URL_GENERATED are required. Falling back to local storage.',
        );
      }
    }

    this.port = this.config.get('PORT', '3000');

    // Local storage directory (relative to project root)
    this.localDir = path.resolve(process.cwd(), 'uploads');
    if (this.useLocal) {
      fs.mkdirSync(this.localDir, { recursive: true });
    }
  }

  private getContainerClient(bucket: StorageBucket): ContainerClient {
    const client = this.containerClients[bucket];
    if (!client) throw new Error(`No Azure container configured for bucket: ${bucket}`);
    return client;
  }

  private getLocalUrl(filePath: string): string {
    const relativePath = path.relative(this.localDir, filePath).replace(/\\/g, '/');
    return `http://localhost:${this.port}/api/uploads/${relativePath}`;
  }

  async uploadFile(
    file: Express.Multer.File,
    prefix: string,
    bucket: StorageBucket = 'originals',
  ): Promise<string> {
    if (this.useLocal) {
      const ext = file.originalname.split('.').pop() || 'jpg';
      const filename = `${uuid()}.${ext}`;
      const dir = path.join(this.localDir, prefix);
      fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, filename);
      fs.writeFileSync(filePath, file.buffer);
      return this.getLocalUrl(filePath);
    }

    const containerClient = this.getContainerClient(bucket);

    const ext = file.originalname.split('.').pop() || 'jpg';
    const blobName = `${prefix}/${uuid()}.${ext}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
    });

    return blockBlobClient.url;
  }

  async uploadFromUrl(
    sourceUrl: string,
    prefix: string,
    bucket: StorageBucket = 'generated',
  ): Promise<string> {
    let buffer: Buffer;

    if (sourceUrl.startsWith('data:')) {
      // Handle data URI (e.g. from Imagen API base64 response)
      const match = sourceUrl.match(/^data:[^;]+;base64,(.+)$/);
      if (!match) throw new Error('Invalid data URI');
      buffer = Buffer.from(match[1], 'base64');
    } else {
      const response = await fetch(sourceUrl);
      buffer = Buffer.from(await response.arrayBuffer());
    }

    if (this.useLocal) {
      const filename = `${uuid()}.png`;
      const dir = path.join(this.localDir, prefix);
      fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, filename);
      fs.writeFileSync(filePath, buffer);
      return this.getLocalUrl(filePath);
    }

    const containerClient = this.getContainerClient(bucket);

    const blobName = `${prefix}/${uuid()}.png`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: 'image/png' },
    });

    return blockBlobClient.url;
  }

  async deleteBlob(blobUrl: string, bucket: StorageBucket = 'generated'): Promise<void> {
    if (this.useLocal) {
      // Extract path from local URL and delete
      const urlPath = new URL(blobUrl).pathname.replace('/api/uploads/', '');
      const filePath = path.join(this.localDir, urlPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return;
    }

    const url = new URL(blobUrl);
    const blobName = url.pathname.split('/').slice(2).join('/');
    const containerClient = this.getContainerClient(bucket);
    await containerClient.getBlockBlobClient(blobName).deleteIfExists();
  }

  /**
   * Upload a raw buffer (e.g. post-processed image) to storage.
   */
  async uploadBuffer(
    buffer: Buffer,
    prefix: string,
    contentType: string = 'image/png',
    bucket: StorageBucket = 'generated',
  ): Promise<string> {
    const ext = contentType.includes('jpeg') ? 'jpg' : 'png';

    if (this.useLocal) {
      const filename = `${uuid()}.${ext}`;
      const dir = path.join(this.localDir, prefix);
      fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, filename);
      fs.writeFileSync(filePath, buffer);
      return this.getLocalUrl(filePath);
    }

    const containerClient = this.getContainerClient(bucket);

    const blobName = `${prefix}/${uuid()}.${ext}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: contentType },
    });

    return blockBlobClient.url;
  }

  /**
   * Returns a base64 data URI for any stored image.
   * Gemini SDK requires inline image data, so we always convert to data URI.
   */
  async resolveExternalUrl(url: string): Promise<string> {
    if (this.useLocal) {
      // Convert local URL → file path → base64 data URI
      try {
        const urlPath = new URL(url).pathname.replace('/api/uploads/', '');
        const filePath = path.join(this.localDir, urlPath);
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).replace('.', '').toLowerCase();
        const mime = ext === 'png' ? 'image/png'
          : ext === 'webp' ? 'image/webp'
          : 'image/jpeg';
        return `data:${mime};base64,${buffer.toString('base64')}`;
      } catch (err) {
        this.logger.error(`Failed to read local file for data URI: ${err}`);
        throw err;
      }
    }

    // Azure: download blob and convert to base64 data URI
    try {
      const response = await fetch(url);
      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || 'image/png';
      return `data:${contentType};base64,${buffer.toString('base64')}`;
    } catch (err) {
      this.logger.error(`Failed to download Azure blob for data URI: ${err}`);
      throw err;
    }
  }

  /**
   * Read any stored image back as a raw Buffer, wherever it lives
   * (local filesystem, Azure blob, or an inline data URI).
   */
  async readAsBuffer(url: string): Promise<Buffer> {
    const resolved = await this.resolveExternalUrl(url);
    const match = resolved.match(/^data:[^;]+;base64,(.+)$/);
    if (match) return Buffer.from(match[1], 'base64');

    const response = await fetch(resolved);
    return Buffer.from(await response.arrayBuffer());
  }

  /** Path to local uploads dir (for serving static files). */
  getLocalUploadsPath(): string | null {
    return this.useLocal ? this.localDir : null;
  }
}
