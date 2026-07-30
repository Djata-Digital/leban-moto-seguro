import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FilesInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { memoryStorage } from 'multer';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

import { CreateRecoveryEvidenceDto } from './dto/create-recovery-evidence.dto';
import { RecoveryEvidencesService } from './recovery-evidences.service';

@Controller('recovery-evidences')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RecoveryEvidencesController {
  constructor(
    private readonly recoveryEvidencesService:
      RecoveryEvidencesService,
  ) {}

  @Permissions('theftReports.update')
  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      /*
       * Os arquivos ficam temporariamente na memória
       * até serem enviados para a Cloudinary.
       */
      storage: memoryStorage(),

      limits: {
        files: 10,
        fileSize: 50 * 1024 * 1024,
      },

      fileFilter: (
        _request,
        file,
        callback,
      ) => {
        const isImage =
          file.mimetype.startsWith('image/');

        const isVideo =
          file.mimetype.startsWith('video/');

        const isAudio =
          file.mimetype.startsWith('audio/');

        const isPdf =
          file.mimetype ===
          'application/pdf';

        const allowed =
          isImage ||
          isVideo ||
          isAudio ||
          isPdf;

        if (!allowed) {
          callback(
            new BadRequestException(
              'Formato não permitido. Envie foto, vídeo, áudio ou PDF.',
            ),
            false,
          );

          return;
        }

        callback(null, true);
      },
    }),
  )
  create(
    @Body()
    dto: CreateRecoveryEvidenceDto,

    @UploadedFiles()
    files: Express.Multer.File[],
  ) {
    return this.recoveryEvidencesService.create(
      dto,
      files ?? [],
    );
  }

  @Permissions('theftReports.view')
  @Get('dispatch/:dispatchId')
  findByDispatch(
    @Param('dispatchId')
    dispatchId: string,
  ) {
    return this.recoveryEvidencesService.findByDispatch(
      dispatchId,
    );
  }

  @Permissions('theftReports.update')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.recoveryEvidencesService.remove(
      id,
    );
  }
}