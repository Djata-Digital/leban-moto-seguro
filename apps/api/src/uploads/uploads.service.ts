import { Injectable } from '@nestjs/common';

@Injectable()
export class UploadsService {
  buildFileUrl(
    folder: string,
    filename: string,
  ) {
    const normalizedFolder =
      folder
        .replace(/\\/g, '/')
        .replace(/^\/+|\/+$/g, '');

    return `/uploads/${normalizedFolder}/${filename}`;
  }
}