import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { DeckFormat } from '../deck-rules';

export type DeckDocument = HydratedDocument<Deck>;
export type DeckSource = 'user' | 'tournament' | 'imported';

@Schema({ _id: false })
export class DeckLine {
  @Prop({ required: true })
  code: string;

  @Prop({ required: true, min: 1, max: 99 })
  quantity: number;
}

export const DeckLineSchema = SchemaFactory.createForClass(DeckLine);

@Schema({ collection: 'decks', timestamps: true, versionKey: false })
export class Deck {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['extra', 'standard'] })
  format: DeckFormat;

  @Prop()
  leaderCode?: string;

  @Prop({ type: [DeckLineSchema], default: [] })
  lines: DeckLine[];

  @Prop({ required: true, enum: ['user', 'tournament', 'imported'] })
  source: DeckSource;

  @Prop()
  sourceRef?: string;

  @Prop({ required: true, default: '' })
  rulesId: string;

  @Prop({ unique: true, sparse: true })
  publicSlug?: string;

  @Prop({ default: false })
  shareEnabled: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const DeckSchema = SchemaFactory.createForClass(Deck);

DeckSchema.index({ userId: 1, updatedAt: -1 });
