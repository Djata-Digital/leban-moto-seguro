import {
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
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CreateRecoveryEvidenceDto } from './dto/create-recovery-evidence.dto';
import { RecoveryEvidencesService } from './recovery-evidences.service';

const uploadDirectory = join(
  process.cwd(),
  'uploads',
  'recovery-evidences',
);

mkdirSync(uploadDirectory, {
  recursive: true,
});

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
      storage: diskStorage({
        destination: uploadDirectory,

        filename: (
          _request,
          file,
          callback,
        ) => {
          const extension =
            extname(file.originalname) ||
            extensionFromMimeType(
              file.mimetype,
            );

          const safeName =
            `${Date.now()}-${Math.round(
              Math.random() * 1_000_000_000,
            )}${extension}`;

          callback(null, safeName);
        },
      }),

      limits: {
        files: 10,
        fileSize: 50 * 1024 * 1024,
      },

      fileFilter: (
        _request,
        file,
        callback,
      ) => {
        const allowed =
          file.mimetype.startsWith('image/') ||
          file.mimetype.startsWith('video/') ||
          file.mimetype.startsWith('audio/') ||
          file.mimetype === 'application/pdf';

        if (!allowed) {
          callback(
            new Error(
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
    @Body() dto: CreateRecoveryEvidenceDto,
    @UploadedFiles()
    files: Express.Multer.File[],
  ) {
    return this.recoveryEvidencesService.create(
      dto,
      files,
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

function extensionFromMimeType(
  mimeType: string,
) {
  if (mimeType === 'image/jpeg') {
    return '.jpg';
  }

  if (mimeType === 'image/png') {
    return '.png';
  }

  if (mimeType === 'image/webp') {
    return '.webp';
  }

  if (mimeType === 'video/mp4') {
    return '.mp4';
  }

  if (mimeType === 'audio/mpeg') {
    return '.mp3';
  }

  if (mimeType === 'audio/wav') {
    return '.wav';
  }

  if (mimeType === 'application/pdf') {
    return '.pdf';
  }

  return '';
}