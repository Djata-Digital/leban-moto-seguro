import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  UploadApiErrorResponse,
  UploadApiResponse,
  v2 as cloudinary,
} from 'cloudinary';
import { Readable } from 'stream';

export interface CloudinaryUploadOptions {
  folder: string;
  publicId?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
}

@Injectable()
export class CloudinaryService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const cloudName = this.configService.get<string>(
      'CLOUDINARY_CLOUD_NAME',
    );
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>(
      'CLOUDINARY_API_SECRET',
    );

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'As variáveis CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET são obrigatórias.',
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    options: CloudinaryUploadOptions,
  ): Promise<UploadApiResponse> {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado.');
    }

    if (!file.buffer) {
      throw new BadRequestException(
        'O arquivo não possui buffer. Configure o Multer com memoryStorage().',
      );
    }

    return new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder,
          public_id: options.publicId,
          resource_type: options.resourceType ?? 'auto',
          overwrite: true,
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error) {
            reject(
              new InternalServerErrorException(
                `Falha ao enviar arquivo para a Cloudinary: ${error.message}`,
              ),
            );
            return;
          }

          if (!result) {
            reject(
              new InternalServerErrorException(
                'A Cloudinary não retornou o resultado do upload.',
              ),
            );
            return;
          }

          resolve(result);
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  async deleteFile(
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image',
  ): Promise<void> {
    if (!publicId) {
      return;
    }

    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido';

      throw new InternalServerErrorException(
        `Falha ao excluir arquivo da Cloudinary: ${message}`,
      );
    }
  }

  extractPublicId(url: string): string | null {
    if (!url || !url.includes('/upload/')) {
      return null;
    }

    try {
      const uploadPart = url.split('/upload/')[1];

      if (!uploadPart) {
        return null;
      }

      const withoutVersion = uploadPart.replace(/^v\d+\//, '');
      const lastDotIndex = withoutVersion.lastIndexOf('.');

      return lastDotIndex > -1
        ? withoutVersion.substring(0, lastDotIndex)
        : withoutVersion;
    } catch {
      return null;
    }
  }
}