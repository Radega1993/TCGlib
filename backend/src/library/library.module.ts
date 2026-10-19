import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import {
  LibraryEntry,
  LibraryEntrySchema,
} from './schemas/library-entry.schema';

@Module({
  imports: [
    AuthModule,
    CatalogModule,
    MongooseModule.forFeature([
      { name: LibraryEntry.name, schema: LibraryEntrySchema },
    ]),
  ],
  controllers: [LibraryController],
  providers: [LibraryService],
})
export class LibraryModule {}
