import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CreateDispatchMessageDto } from './dto/create-dispatch-message.dto';
import { DispatchMessagesService } from './dispatch-messages.service';

@Controller('dispatch-messages')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DispatchMessagesController {
  constructor(
    private readonly dispatchMessagesService: DispatchMessagesService,
  ) {}

  @Permissions('theftReports.update')
  @Post()
  create(@Body() dto: CreateDispatchMessageDto) {
    return this.dispatchMessagesService.create(dto);
  }

  @Permissions('theftReports.view')
  @Get('dispatch/:dispatchId')
  findByDispatch(
    @Param('dispatchId') dispatchId: string,
  ) {
    return this.dispatchMessagesService.findByDispatch(dispatchId);
  }

  @Permissions('theftReports.update')
  @Patch('dispatch/:dispatchId/read')
  markAsRead(
    @Param('dispatchId') dispatchId: string,
    @Query('senderType') senderType: string,
  ) {
    return this.dispatchMessagesService.markAsRead(
      dispatchId,
      senderType,
    );
  }

  @Permissions('theftReports.view')
  @Get('dispatch/:dispatchId/unread')
  countUnread(
    @Param('dispatchId') dispatchId: string,
    @Query('senderType') senderType: string,
  ) {
    return this.dispatchMessagesService.countUnread(
      dispatchId,
      senderType,
    );
  }
}