import {
  BadRequestException,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { UploadsService } from './uploads.service';

type UploadConfiguration = {
  folder: string;
  onlyImages: boolean;
  maxSizeMb: number;
};

const uploadConfigurations: Record<string, UploadConfiguration> = {
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
    throw new BadRequestException('Tipo de upload inválido.');
  }

  return configuration;
}

function validateFileType(
  file: {
    mimetype: string;
  },
  onlyImages: boolean,
): void {
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

@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly uploadsService: UploadsService,
  ) {}

  /*
   * Uploads organizados.
   *
   * Exemplos:
   * POST /uploads/users/profile
   * POST /uploads/owners/identity
   * POST /uploads/drivers/license
   */
  @Post(':category/:type')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),

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
  async uploadStructuredFile(
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

    const result =
      await this.uploadsService.uploadFile(
        file,
        configuration.folder,
      );

    return {
      originalName: file.originalname,

      /*
       * Mantido para compatibilidade com o frontend.
       * Agora representa o public_id da Cloudinary.
       */
      filename: result.publicId,

      mimetype: file.mimetype,
      size: file.size,
      category,
      type,
      folder: configuration.folder,

      url: result.url,
      secureUrl: result.url,
      publicId: result.publicId,
      resourceType: result.resourceType,
      format: result.format,
    };
  }

  /*
   * Endpoint antigo mantido para não quebrar
   * funcionalidades existentes.
   *
   * Exemplo:
   * POST /uploads/documents
   */
  @Post(':folder')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),

      limits: {
        fileSize: 10 * 1024 * 1024,
      },

      fileFilter: (
        req,
        file,
        callback,
      ) => {
        try {
          const folder = String(
            req.params.folder,
          );

          if (
            !legacyFolders.includes(
              folder,
            )
          ) {
            throw new BadRequestException(
              'Pasta de upload inválida.',
            );
          }

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
  async uploadLegacyFile(
    @Param('folder')
    folder: string,

    @UploadedFile()
    file: Express.Multer.File,
  ) {
    if (
      !legacyFolders.includes(
        folder,
      )
    ) {
      throw new BadRequestException(
        'Pasta de upload inválida.',
      );
    }

    if (!file) {
      throw new BadRequestException(
        'Nenhum arquivo enviado.',
      );
    }

    const result =
      await this.uploadsService.uploadFile(
        file,
        folder,
      );

    return {
      originalName: file.originalname,

      /*
       * Mantido para compatibilidade.
       */
      filename: result.publicId,

      mimetype: file.mimetype,
      size: file.size,
      folder,

      url: result.url,
      secureUrl: result.url,
      publicId: result.publicId,
      resourceType: result.resourceType,
      format: result.format,
    };
  }
}