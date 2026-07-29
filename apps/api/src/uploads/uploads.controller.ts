import {
  BadRequestException,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

import { UploadsService } from './uploads.service';

type UploadConfiguration = {
  folder: string;
  onlyImages: boolean;
  maxSizeMb: number;
};

const uploadConfigurations: Record<
  string,
  UploadConfiguration
> = {
  'users/profile': {
    folder: 'users/profiles',
    onlyImages: true,
    maxSizeMb: 5,
  },

  'owners/profile': {
    folder: 'owners/profiles',
    onlyImages: true,
    maxSizeMb: 5,
  },

  'owners/identity': {
    folder: 'owners/identity',
    onlyImages: false,
    maxSizeMb: 10,
  },

  'owners/purchase': {
    folder: 'owners/purchase',
    onlyImages: false,
    maxSizeMb: 10,
  },

  'drivers/profile': {
    folder: 'drivers/profiles',
    onlyImages: true,
    maxSizeMb: 5,
  },

  'drivers/identity': {
    folder: 'drivers/identity',
    onlyImages: false,
    maxSizeMb: 10,
  },

  'drivers/license': {
    folder: 'drivers/license',
    onlyImages: false,
    maxSizeMb: 10,
  },

  'motorcycles/photo': {
    folder: 'motorcycles/photos',
    onlyImages: true,
    maxSizeMb: 5,
  },
};

const legacyFolders = [
  'documents',
  'motorcycles',
  'owners',
  'drivers',
  'theft-reports',
  'recovery-evidences',
];

function getConfiguration(
  category: string,
  type: string,
): UploadConfiguration {
  const key = `${category}/${type}`;
  const configuration = uploadConfigurations[key];

  if (!configuration) {
    throw new BadRequestException(
      'Tipo de upload inválido.',
    );
  }

  return configuration;
}

function validateFileType(
  file: {
    mimetype: string;
  },
  onlyImages: boolean,
) {
  const allowedImageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  const allowedDocumentTypes = [
    ...allowedImageTypes,
    'application/pdf',
  ];

  const allowedTypes = onlyImages
    ? allowedImageTypes
    : allowedDocumentTypes;

  if (!allowedTypes.includes(file.mimetype)) {
    throw new BadRequestException(
      onlyImages
        ? 'Tipo de arquivo inválido. Envie uma imagem JPG, PNG ou WEBP.'
        : 'Tipo de arquivo inválido. Envie JPG, PNG, WEBP ou PDF.',
    );
  }
}

function generateFileName(
  file: {
    originalname: string;
  },
) {
  const extension = extname(
    file.originalname,
  ).toLowerCase();

  return `${randomUUID()}${extension}`;
}

@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly uploadsService: UploadsService,
  ) {}

  /*
   * Novos uploads organizados.
   *
   * Exemplos:
   * POST /uploads/users/profile
   * POST /uploads/owners/identity
   * POST /uploads/drivers/license
   */
  @Post(':category/:type')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (
          req,
          file,
          callback,
        ) => {
          try {
            const category = String(
              req.params.category,
            );

            const type = String(
              req.params.type,
            );

            const configuration =
              getConfiguration(
                category,
                type,
              );

            callback(
              null,
              `uploads/${configuration.folder}`,
            );
          } catch (error) {
            callback(
              error as Error,
              '',
            );
          }
        },

        filename: (
          req,
          file,
          callback,
        ) => {
          callback(
            null,
            generateFileName(file),
          );
        },
      }),

      limits: {
        fileSize: 10 * 1024 * 1024,
      },

      fileFilter: (
        req,
        file,
        callback,
      ) => {
        try {
          const category = String(
            req.params.category,
          );

          const type = String(
            req.params.type,
          );

          const configuration =
            getConfiguration(
              category,
              type,
            );

          validateFileType(
            file,
            configuration.onlyImages,
          );

          callback(null, true);
        } catch (error) {
          callback(
            error as Error,
            false,
          );
        }
      },
    }),
  )
  uploadStructuredFile(
    @Param('category')
    category: string,

    @Param('type')
    type: string,

    @UploadedFile()
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Nenhum arquivo enviado.',
      );
    }

    const configuration =
      getConfiguration(
        category,
        type,
      );

    const maxSizeBytes =
      configuration.maxSizeMb *
      1024 *
      1024;

    if (file.size > maxSizeBytes) {
      throw new BadRequestException(
        `O arquivo não pode ultrapassar ${configuration.maxSizeMb} MB.`,
      );
    }

    return {
      originalName: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      category,
      type,
      folder: configuration.folder,

      url: this.uploadsService.buildFileUrl(
        configuration.folder,
        file.filename,
      ),
    };
  }

  /*
   * Endpoint antigo mantido para não quebrar
   * funcionalidades já existentes.
   */
  @Post(':folder')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (
          req,
          file,
          callback,
        ) => {
          const folder = String(
            req.params.folder,
          );

          if (
            !legacyFolders.includes(
              folder,
            )
          ) {
            return callback(
              new BadRequestException(
                'Pasta de upload inválida.',
              ),
              '',
            );
          }

          callback(
            null,
            `uploads/${folder}`,
          );
        },

        filename: (
          req,
          file,
          callback,
        ) => {
          callback(
            null,
            generateFileName(file),
          );
        },
      }),

      limits: {
        fileSize: 10 * 1024 * 1024,
      },

      fileFilter: (
        req,
        file,
        callback,
      ) => {
        try {
          validateFileType(
            file,
            false,
          );

          callback(null, true);
        } catch (error) {
          callback(
            error as Error,
            false,
          );
        }
      },
    }),
  )
  uploadLegacyFile(
    @Param('folder')
    folder: string,

    @UploadedFile()
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Nenhum arquivo enviado.',
      );
    }

    return {
      originalName: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      folder,

      url: this.uploadsService.buildFileUrl(
        folder,
        file.filename,
      ),
    };
  }
}