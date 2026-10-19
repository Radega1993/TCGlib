import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController, MeController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { ActivityDay, ActivityDaySchema } from './schemas/activity-day.schema';
import { LoginCode, LoginCodeSchema } from './schemas/login-code.schema';
import { Session, SessionSchema } from './schemas/session.schema';
import { User, UserSchema } from './schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Session.name, schema: SessionSchema },
      { name: LoginCode.name, schema: LoginCodeSchema },
      { name: ActivityDay.name, schema: ActivityDaySchema },
    ]),
  ],
  controllers: [AuthController, MeController],
  providers: [AuthService, AuthGuard],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
