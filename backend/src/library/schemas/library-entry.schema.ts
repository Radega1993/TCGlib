import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LibraryList = 'owned' | 'wanted';
export type LibraryEntryDocument = HydratedDocument<LibraryEntry>;

@Schema({ collection: 'library_entries', timestamps: true, versionKey: false })
export class LibraryEntry {
  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  productExternalId: number;

  @Prop({ required: true, enum: ['owned', 'wanted'] })
  list: LibraryList;

  @Prop({ required: true, min: 1, max: 99 })
  quantity: number;

  @Prop({ default: 0, min: 0, max: 99 })
  forTrade: number;
}

export const LibraryEntrySchema = SchemaFactory.createForClass(LibraryEntry);

LibraryEntrySchema.index(
  { userId: 1, list: 1, productExternalId: 1 },
  { unique: true },
);
LibraryEntrySchema.index({ list: 1, productExternalId: 1 });
