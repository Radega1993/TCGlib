import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ActivityDayDocument = HydratedDocument<ActivityDay>;

@Schema({ collection: 'activity_days', versionKey: false })
export class ActivityDay {
  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  day: string;
}

export const ActivityDaySchema = SchemaFactory.createForClass(ActivityDay);

ActivityDaySchema.index({ userId: 1, day: 1 }, { unique: true });
ActivityDaySchema.index({ day: 1 });
