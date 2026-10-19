import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { EnvConfig, validateEnv } from './config/env.validation';
import { HealthController } from './health.controller';
import { LibraryModule } from './library/library.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), '.env'),
        join(process.cwd(), '../.env'),
      ],
      validate: validateEnv,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        uri: config.get('MONGODB_URI'),
        serverSelectionTimeoutMS: 8000,
      }),
    }),
    CatalogModule,
    AuthModule,
    LibraryModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
