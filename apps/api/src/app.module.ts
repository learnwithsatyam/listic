import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ImagesModule } from './images/images.module';
import { StorageModule } from './storage/storage.module';
import { PlatformsModule } from './platforms/platforms.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbUrl = config.get<string>('DATABASE_URL');
        const isLocal = (dbUrl || '').includes('localhost');
        return {
          type: 'postgres',
          url: dbUrl,
          ssl: isLocal ? false : { rejectUnauthorized: false },
          autoLoadEntities: true,
          synchronize: config.get('NODE_ENV') !== 'production',
          retryAttempts: 2,
          retryDelay: 1000,
          extra: {
            connectionTimeoutMillis: 5000,
          },
        };
      },
    }),

    AuthModule,
    UsersModule,
    ImagesModule,
    StorageModule,
    PlatformsModule,
  ],
})
export class AppModule {}
