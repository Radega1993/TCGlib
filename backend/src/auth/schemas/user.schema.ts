import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ collection: 'users', timestamps: true, versionKey: false })
export class User {
  @Prop({ required: true, unique: true })
  googleId: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  alias?: string;

  @Prop()
  picture?: string;

  @Prop()
  lastSeenAt?: Date;

  @Prop({ unique: true, sparse: true })
  publicSlug?: string;

  @Prop({ unique: true, sparse: true })
  wantedSlug?: string;

  @Prop({ unique: true, sparse: true })
  tradeSlug?: string;

  @Prop({ default: false })
  shareEnabled: boolean;

  @Prop({ default: false })
  blocked: boolean;

  @Prop({ type: Object })
  collectionGoal?: {
    mode?: string;
    customCopies?: number;
    excludedVariants?: string[];
  };
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ lastSeenAt: -1 });
UserSchema.index({ createdAt: -1 });
