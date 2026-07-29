import { Module } from '@nestjs/common';
import { MotorcycleRoutesController } from './motorcycle-routes.controller';
import { MotorcycleRoutesService } from './motorcycle-routes.service';

@Module({
  controllers: [MotorcycleRoutesController],
  providers: [MotorcycleRoutesService],
  exports: [MotorcycleRoutesService],
})
export class MotorcycleRoutesModule {}