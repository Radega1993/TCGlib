import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SyncRunDocument = HydratedDocument<SyncRun>;
export type SyncRunStatus = 'running' | 'completed' | 'failed';

@Schema({ collection: 'sync_runs', timestamps: true, versionKey: false })
export class SyncRun {
  @Prop({ required: true, index: true })
  tcgSlug: string;

  @Prop({ required: true, enum: ['running', 'completed', 'failed'] })
  status: SyncRunStatus;

  @Prop({ required: true })
  startedAt: Date;

  @Prop()
  finishedAt?: Date;

  @Prop({ default: 0 })
  requests: number;

  @Prop({ default: 0 })
  setsUpserted: number;

  @Prop({ default: 0 })
  productsUpserted: number;

  @Prop({ default: 0 })
  cards: number;

  @Prop({ default: 0 })
  sealed: number;

  @Prop()
  error?: string;
}

export const SyncRunSchema = SchemaFactory.createForClass(SyncRun);

SyncRunSchema.index({ tcgSlug: 1, startedAt: -1 });
