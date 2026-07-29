import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';

import {
  FileFieldsInterceptor,
} from '@nestjs/platform-express';

import { diskStorage } from 'multer';
import {
  extname,
  join,
} from 'node:path';
import {
  existsSync,
  mkdirSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';

import { CreateMotorcycleDto } from './dto/create-motorcycle.dto';
import { UpdateMotorcycleDto } from './dto/update-motorcycle.dto';
import { MotorcyclesService } from './motorcycles.service';
import { MotorcycleUploadsService } from './motorcycle-uploads.service';

type MotorcycleUploadFiles = {
  photo?: Express.Multer.File[];
  document?: Express.Multer.File[];
};

function ensureUploadDirectory(
  folder: 'photos' | 'documents',
) {
  const uploadPath = join(
    process.cwd(),
    'uploads',
    'motorcycles',
    folder,
  );

  if (!existsSync(uploadPath)) {
    mkdirSync(uploadPath, {
      recursive: true,
    });
  }

  return uploadPath;
}

function createSafeFilename(
  file: Express.Multer.File,
) {
  const extension =
    extname(file.originalname).toLowerCase();

  return `${Date.now()}-${randomUUID()}${extension}`;
}

@Controller('motorcycles')
export class MotorcyclesController {
  constructor(
    private readonly motorcyclesService: MotorcyclesService,
    private readonly motorcycleUploadsService:
      MotorcycleUploadsService,
  ) {}

  @Post()
  create(@Body() dto: CreateMotorcycleDto) {
    return this.motorcyclesService.create(dto);
  }

  @Post(':id/files')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        {
          name: 'photo',
          maxCount: 1,
        },
        {
          name: 'document',
          maxCount: 1,
        },
      ],
      {
        storage: diskStorage({
          destination: (
            request,
            file,
            callback,
          ) => {
            const folder =
              file.fieldname === 'photo'
                ? 'photos'
                : 'documents';

            callback(
              null,
              ensureUploadDirectory(folder),
            );
          },

          filename: (
            request,
            file,
            callback,
          ) => {
            callback(
              null,
              createSafeFilename(file),
            );
          },
        }),

        limits: {
          fileSize: 10 * 1024 * 1024,
          files: 2,
        },

        fileFilter: (
          request,
          file,
          callback,
        ) => {
          const photoMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
          ];

          const documentMimeTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
          ];

          if (
            file.fieldname === 'photo' &&
            !photoMimeTypes.includes(file.mimetype)
          ) {
            return callback(
              new BadRequestException(
                'A foto deve estar em formato JPG, PNG ou WEBP.',
              ),
              false,
            );
          }

          if (
            file.fieldname === 'document' &&
            !documentMimeTypes.includes(
              file.mimetype,
            )
          ) {
            return callback(
              new BadRequestException(
                'O documento deve estar em formato PDF, JPG, PNG ou WEBP.',
              ),
              false,
            );
          }

          callback(null, true);
        },
      },
    ),
  )
  uploadFiles(
    @Param('id') id: string,
    @UploadedFiles()
    files: MotorcycleUploadFiles,
  ) {
    return this.motorcycleUploadsService.uploadFiles(
      id,
      files ?? {},
    );
  }

  @Get()
  findAll() {
    return this.motorcyclesService.findAll();
  }

  @Get('plate/:plateNumber')
  findByPlate(
    @Param('plateNumber')
    plateNumber: string,
  ) {
    return this.motorcyclesService.findByPlate(
      plateNumber,
    );
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.motorcyclesService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMotorcycleDto,
  ) {
    return this.motorcyclesService.update(
      id,
      dto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.motorcyclesService.remove(id);
  }
}