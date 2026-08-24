import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudioController } from './studio.controller';
import { StudioService } from './studio.service';
import { StudioAiService } from './studio-ai.service';
import { StudioBackground, FoodShoot, FoodShot } from './entities/studio.entity';
import { ImagesModule } from '../images/images.module';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudioBackground, FoodShoot, FoodShot]),
    ImagesModule,
    StorageModule,
    UsersModule,
  ],
  controllers: [StudioController],
  providers: [StudioService, StudioAiService],
  exports: [StudioService],
})
export class StudioModule {}
