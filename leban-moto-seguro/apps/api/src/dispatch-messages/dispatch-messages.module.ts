import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { DispatchMessagesController } from './dispatch-messages.controller';
import { DispatchMessagesService } from './dispatch-messages.service';

@Module({
  imports: [
    PrismaModule,
    RealtimeModule,
  ],
  controllers: [DispatchMessagesController],
  providers: [DispatchMessagesService],
  exports: [DispatchMessagesService],
})
export class DispatchMessagesModule {}