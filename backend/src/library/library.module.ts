import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { CatalogModule } from '../catalog/catalog.module';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { DeckPublicController } from './deck-public.controller';
import { DeckController } from './deck.controller';
import { DeckService } from './deck.service';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import { ShareController } from './share.controller';
import { Deck, DeckSchema } from './schemas/deck.schema';
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
      { name: Deck.name, schema: DeckSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [
    LibraryController,
    ShareController,
    CollectionController,
    DeckController,
    DeckPublicController,
  ],
  providers: [LibraryService, CollectionService, DeckService],
})
export class LibraryModule {}
