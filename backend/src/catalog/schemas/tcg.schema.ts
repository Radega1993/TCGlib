import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TcgDocument = HydratedDocument<Tcg>;

@Schema({ collection: 'tcgs', timestamps: true, versionKey: false })
export class Tcg {
  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  logo?: string;

  @Prop({ type: Object })
  markets?: Record<string, unknown>;

  @Prop()
  sourceCreatedAt?: Date;

  @Prop()
  sourceUpdatedAt?: Date;

  @Prop({ required: true })
  syncedAt: Date;
}

export const TcgSchema = SchemaFactory.createForClass(Tcg);
