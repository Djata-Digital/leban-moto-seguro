import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { IgnitionCommandsController } from './ignition-commands.controller';
import { IgnitionCommandsService } from './ignition-commands.service';

@Module({ imports: [AuditModule], controllers: [IgnitionCommandsController], providers: [IgnitionCommandsService] })
export class IgnitionCommandsModule {}
