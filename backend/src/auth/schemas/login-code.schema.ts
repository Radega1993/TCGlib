import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LoginCodeDocument = HydratedDocument<LoginCode>;

@Schema({ collection: 'login_codes', timestamps: false, versionKey: false })
export class LoginCode {
  @Prop({ required: true, unique: true })
  codeHash: string;

  @Prop({ required: true })
  sessionToken: string;

  @Prop({ required: true })
  expiresAt: Date;
}

export const LoginCodeSchema = SchemaFactory.createForClass(LoginCode);

LoginCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
