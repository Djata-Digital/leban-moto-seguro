import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreatePoliceCheckDto } from './dto/create-police-check.dto';
import { CreatePoliceOfficerDto } from './dto/create-police-officer.dto';
import { PoliceService } from './police.service';

@Controller('police')
export class PoliceController {
  constructor(private readonly policeService: PoliceService) {}

  @Post('officers')
  createOfficer(@Body() dto: CreatePoliceOfficerDto) {
    return this.policeService.createOfficer(dto);
  }

  @Get('officers')
  findOfficers() {
    return this.policeService.findOfficers();
  }

  @Get('inspect/plate/:plateNumber')
  inspectByPlate(@Param('plateNumber') plateNumber: string) {
    return this.policeService.inspectByPlate(plateNumber);
  }

  @Get('inspect/chassis/:chassisNumber')
  inspectByChassis(@Param('chassisNumber') chassisNumber: string) {
    return this.policeService.inspectByChassis(chassisNumber);
  }

  @Get('inspect/engine/:engineNumber')
  inspectByEngine(@Param('engineNumber') engineNumber: string) {
    return this.policeService.inspectByEngine(engineNumber);
  }

  @Get('verify-authorization/:verificationCode')
  verifyAuthorizationCode(@Param('verificationCode') verificationCode: string) {
    return this.policeService.verifyAuthorizationCode(verificationCode);
  }

  @Post('checks')
  createCheck(@Body() dto: CreatePoliceCheckDto) {
    return this.policeService.createCheck(dto);
  }

  @Get('checks')
  findChecks() {
    return this.policeService.findChecks();
  }
}