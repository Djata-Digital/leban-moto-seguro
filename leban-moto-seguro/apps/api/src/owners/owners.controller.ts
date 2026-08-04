import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { OwnersService } from './owners.service';
import { CreateOwnerDto } from './dto/create-owner.dto';
import { UpdateOwnerDto } from './dto/update-owner.dto';

@Controller('owners')
export class OwnersController {
  constructor(
    private readonly ownersService: OwnersService,
  ) {}

  @Post()
  create(@Body() dto: CreateOwnerDto) {
    return this.ownersService.create(dto);
  }

  @Get()
  findAll() {
    return this.ownersService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.ownersService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOwnerDto,
  ) {
    return this.ownersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ownersService.remove(id);
  }
}