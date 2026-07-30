import { Module } from '@nestjs/common';

import { UploadsModule } from '../uploads/uploads.module';

import { OwnersController } from './owners.controller';
import { OwnersService } from './owners.service';

@Module({
  imports: [UploadsModule],
  controllers: [OwnersController],
  providers: [OwnersService],
  exports: [OwnersService],
})
export class OwnersModule {}