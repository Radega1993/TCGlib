import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UsageKind = 'search' | 'view';
export type UsageEventDocument = HydratedDocument<UsageEvent>;

@Schema({
  collection: 'usage_events',
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class UsageEvent {
  @Prop({ required: true, enum: ['search', 'view'] })
  kind: UsageKind;

  @Prop({ required: true })
  key: string;
}

export const UsageEventSchema = SchemaFactory.createForClass(UsageEvent);

UsageEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 180 * 24 * 60 * 60 },
);
UsageEventSchema.index({ kind: 1, createdAt: -1 });
