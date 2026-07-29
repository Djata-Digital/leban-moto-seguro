import { Module } from '@nestjs/common';
import { OwnerPortalController } from './owner-portal.controller';
import { OwnerPortalService } from './owner-portal.service';

@Module({
  controllers: [OwnerPortalController],
  providers: [OwnerPortalService],
})
export class OwnerPortalModule {}
