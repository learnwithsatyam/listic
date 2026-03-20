import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { StorageService } from './storage/storage.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:8081'],
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
