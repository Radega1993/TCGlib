import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CatalogSyncService } from './catalog/sync/catalog-sync.service';

async function bootstrap() {
  const logger = new Logger('SyncOnePiece');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const result = await app.get(CatalogSyncService).syncOnePiece();
    logger.log(JSON.stringify(result));
    await app.close();
  } catch (error) {
    logger.error(error instanceof Error ? error.stack : String(error));
    await app.close();
    process.exit(1);
  }
}

void bootstrap();
