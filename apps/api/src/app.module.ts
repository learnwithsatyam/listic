import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ImagesModule } from './images/images.module';
import { StudioModule } from './studio/studio.module';
import { StorageModule } from './storage/storage.module';
import { PlatformsModule } from './platforms/platforms.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';

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
          retryAttempts: 3,
          retryDelay: 1000,
          extra: {
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
            max: 5,
            // Keepalive prevents Neon from killing idle connections
            keepAlive: true,
            keepAliveInitialDelayMillis: 10000,
          },
        };
      },
    }),

    AuthModule,
    UsersModule,
    ImagesModule,
    StudioModule,
    StorageModule,
    PlatformsModule,
    PaymentsModule,
    AdminModule,
  ],
})
export class AppModule {}
