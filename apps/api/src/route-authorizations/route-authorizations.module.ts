import { Module } from '@nestjs/common';
import { RouteAuthorizationsController } from './route-authorizations.controller';
import { RouteAuthorizationsService } from './route-authorizations.service';

@Module({
  controllers: [RouteAuthorizationsController],
  providers: [RouteAuthorizationsService],
  exports: [RouteAuthorizationsService],
})
export class RouteAuthorizationsModule {}