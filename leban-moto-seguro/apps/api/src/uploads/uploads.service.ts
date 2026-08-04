import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';

import { CloudinaryService } from '../cloudinary/cloudinary.service';

export type UploadedFileResult = {
  url: string;
  publicId: string;
  resourceType: string;
  format?: string;
};

@Injectable()
export class UploadsService {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadedFileResult> {
    const normalizedFolder =
      this.normalizeFolder(folder);

    const publicId =
      this.generatePublicId(
        file.originalname,
      );

    const result =
      await this.cloudinaryService.uploadFile(
        file,
        {
          folder: `leban-moto-seguro/${normalizedFolder}`,
          publicId,
          resourceType: 'auto',
        },
      );

    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
    };
  }

  async deleteFile(
    publicId: string,
    resourceType:
      | 'image'
      | 'video'
      | 'raw' = 'image',
  ): Promise<void> {
    await this.cloudinaryService.deleteFile(
      publicId,
      resourceType,
    );
  }

  extractPublicId(
    url: string,
  ): string | null {
    return this.cloudinaryService.extractPublicId(
      url,
    );
  }

  private normalizeFolder(
    folder: string,
  ): string {
    return folder
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '');
  }

  private generatePublicId(
    originalName: string,
  ): string {
    const extension = extname(
      originalName,
    );

    const nameWithoutExtension =
      extension
        ? originalName.slice(
            0,
            -extension.length,
          )
        : originalName;

    const safeName =
      nameWithoutExtension
        .normalize('NFD')
        .replace(
          /[\u0300-\u036f]/g,
          '',
        )
        .replace(
          /[^a-zA-Z0-9_-]/g,
          '-',
        )
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase()
        .slice(0, 50);

    return safeName
      ? `${safeName}-${randomUUID()}`
      : randomUUID();
  }
}