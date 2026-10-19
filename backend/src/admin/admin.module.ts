import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminGuard } from '../auth/admin.guard';
import { AuthModule } from '../auth/auth.module';
import { ActivityDay, ActivityDaySchema } from '../auth/schemas/activity-day.schema';
import { Session, SessionSchema } from '../auth/schemas/session.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { CatalogModule } from '../catalog/catalog.module';
import { SyncRun, SyncRunSchema } from '../catalog/schemas/sync-run.schema';
import { UsageEvent, UsageEventSchema } from '../catalog/schemas/usage-event.schema';
import {
  LibraryEntry,
  LibraryEntrySchema,
} from '../library/schemas/library-entry.schema';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    AuthModule,
    CatalogModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Session.name, schema: SessionSchema },
      { name: LibraryEntry.name, schema: LibraryEntrySchema },
      { name: SyncRun.name, schema: SyncRunSchema },
      { name: ActivityDay.name, schema: ActivityDaySchema },
      { name: UsageEvent.name, schema: UsageEventSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
