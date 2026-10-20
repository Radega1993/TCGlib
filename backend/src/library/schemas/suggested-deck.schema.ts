import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { DeckLine, DeckLineSchema } from './deck.schema';

export type SuggestedDeckDocument = HydratedDocument<SuggestedDeck>;

@Schema({ collection: 'suggested_decks', timestamps: true, versionKey: false })
export class SuggestedDeck {
  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true, unique: true })
  fingerprint: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  author: string;

  @Prop({ required: true })
  leaderCode: string;

  @Prop({ type: [DeckLineSchema], required: true })
  lines: DeckLine[];

  @Prop({ required: true })
  meta: string;

  @Prop({ required: true, min: 0 })
  views: number;

  @Prop({ required: true })
  publishedAt: Date;

  @Prop({ required: true, default: 'dotgg' })
  source: 'dotgg';
}

export const SuggestedDeckSchema = SchemaFactory.createForClass(SuggestedDeck);
