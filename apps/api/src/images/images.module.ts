import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { ImagenService } from './imagen.service';
import {
  ImageProject,
  GeneratedImage,
} from './entities/image-project.entity';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';
import { PlatformsModule } from '../platforms/platforms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ImageProject, GeneratedImage]),
    StorageModule,
    UsersModule,
    PlatformsModule,
  ],
  controllers: [ImagesController],
  providers: [ImagesService, ImagenService],
  exports: [ImagesService],
})
export class ImagesModule {}
