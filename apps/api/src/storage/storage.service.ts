import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly blobServiceClient: BlobServiceClient | null = null;
  private readonly containerName: string;
  private readonly logger = new Logger(StorageService.name);
  private readonly useLocal: boolean;
  private readonly localDir: string;
  private readonly port: string;

  constructor(private readonly config: ConfigService) {
    const connectionString = this.config.get<string>(
      'AZURE_STORAGE_CONNECTION_STRING',
    );

    if (connectionString) {
      this.blobServiceClient =
        BlobServiceClient.fromConnectionString(connectionString);
      this.useLocal = false;
      this.logger.log('Using Azure Blob Storage');
    } else {
      this.useLocal = true;
      this.logger.warn(
        'AZURE_STORAGE_CONNECTION_STRING not set — using local filesystem storage',
      );
    }

    this.containerName = this.config.get('AZURE_STORAGE_CONTAINER', 'listic');
    this.port = this.config.get('PORT', '3000');

    // Local storage directory (relative to project root)
    this.localDir = path.resolve(process.cwd(), 'uploads');
    if (this.useLocal) {
      fs.mkdirSync(this.localDir, { recursive: true });
    }
  }

  private getLocalUrl(filePath: string): string {
    const relativePath = path.relative(this.localDir, filePath).replace(/\\/g, '/');
    return `http://localhost:${this.port}/api/uploads/${relativePath}`;
  }

  async uploadFile(file: Express.Multer.File, prefix: string): Promise<string> {
    if (this.useLocal) {
      const ext = file.originalname.split('.').pop() || 'jpg';
      const filename = `${uuid()}.${ext}`;
      const dir = path.join(this.localDir, prefix);
      fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, filename);
      fs.writeFileSync(filePath, file.buffer);
      return this.getLocalUrl(filePath);
    }

    const containerClient = this.blobServiceClient!.getContainerClient(
      this.containerName,
    );
    await containerClient.createIfNotExists({ access: 'blob' });

    const ext = file.originalname.split('.').pop() || 'jpg';
    const blobName = `${prefix}/${uuid()}.${ext}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
    });

    return blockBlobClient.url;
  }

  async uploadFromUrl(sourceUrl: string, prefix: string): Promise<string> {
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

    const containerClient = this.blobServiceClient!.getContainerClient(
      this.containerName,
    );
    await containerClient.createIfNotExists({ access: 'blob' });

    const blobName = `${prefix}/${uuid()}.png`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: 'image/png' },
    });

    return blockBlobClient.url;
  }

  async deleteBlob(blobUrl: string): Promise<void> {
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
    const containerClient = this.blobServiceClient!.getContainerClient(
      this.containerName,
    );
    await containerClient.getBlockBlobClient(blobName).deleteIfExists();
  }

  /**
   * Returns a URL usable by external services (e.g. Replicate).
   * For Azure, returns the original public URL.
   * For local storage, reads the file and returns a base64 data URI.
   */
  resolveExternalUrl(url: string): string {
    if (!this.useLocal) return url;

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
      return url; // fallback
    }
  }

  /** Path to local uploads dir (for serving static files). */
  getLocalUploadsPath(): string | null {
    return this.useLocal ? this.localDir : null;
  }
}
