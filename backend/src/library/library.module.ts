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
import {
  SuggestedDeck,
  SuggestedDeckSchema,
} from './schemas/suggested-deck.schema';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';
import { SuggestedDecksService } from './suggested-decks.service';

@Module({
  imports: [
    AuthModule,
    CatalogModule,
    MongooseModule.forFeature([
      { name: LibraryEntry.name, schema: LibraryEntrySchema },
      { name: Deck.name, schema: DeckSchema },
      { name: SuggestedDeck.name, schema: SuggestedDeckSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [
    LibraryController,
    ShareController,
    CollectionController,
    DeckController,
    DeckPublicController,
    PlayersController,
  ],
  providers: [LibraryService, CollectionService, DeckService, SuggestedDecksService, PlayersService],
  exports: [SuggestedDecksService],
})
export class LibraryModule {}
