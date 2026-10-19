import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CardSetDocument = HydratedDocument<CardSet>;

@Schema({ collection: 'sets', timestamps: true, versionKey: false })
export class CardSet {
  @Prop({ required: true, unique: true })
  externalId: string;

  @Prop({ required: true, index: true })
  tcgSlug: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  slug: string;

  @Prop()
  code?: string;

  @Prop()
  releaseDate?: Date;

  @Prop({ type: String, default: null })
  serie?: string | null;

  @Prop({ type: Object })
  markets?: Record<string, unknown>;

  @Prop()
  sourceCreatedAt?: Date;

  @Prop()
  sourceUpdatedAt?: Date;

  @Prop({ required: true })
  syncedAt: Date;
}

export const CardSetSchema = SchemaFactory.createForClass(CardSet);

CardSetSchema.index({ tcgSlug: 1, code: 1 });
CardSetSchema.index({ tcgSlug: 1, releaseDate: -1 });
