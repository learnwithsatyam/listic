import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { StorageService } from './storage/storage.service';

async function bootstrap() {
  // Block production startup with insecure JWT secret
  const jwtSecret = process.env.JWT_SECRET || '';
  if (process.env.NODE_ENV === 'production' && jwtSecret.includes('change-in-production')) {
    console.error('FATAL: JWT_SECRET is still the dev placeholder. Set a strong secret for production.');
    process.exit(1);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:8081',
      'http://localhost:5173',
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  // Serve local uploads when Azure Storage is not configured
  const storage = app.get(StorageService);
  const uploadsPath = storage.getLocalUploadsPath();
  if (uploadsPath) {
    app.useStaticAssets(uploadsPath, { prefix: '/api/uploads' });
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Listic API running on port ${port}`);
}
bootstrap();
