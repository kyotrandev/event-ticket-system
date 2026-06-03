import {
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

import { FileRepository } from '../../persistence/file.repository';
import { AllConfigType } from '../../../../config/config.type';
import { FileType } from '../../../domain/file';

@Injectable()
export class FilesCloudinaryService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly fileRepository: FileRepository,
  ) {
    cloudinary.config({
      cloud_name: this.configService.getOrThrow('file.cloudinaryCloudName', {
        infer: true,
      }),
      api_key: this.configService.getOrThrow('file.cloudinaryApiKey', {
        infer: true,
      }),
      api_secret: this.configService.getOrThrow('file.cloudinaryApiSecret', {
        infer: true,
      }),
    });
  }

  async create(file: Express.Multer.File): Promise<{ file: FileType }> {
    if (!file) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          file: 'selectFile',
        },
      });
    }

    const uploaded = await this.uploadBuffer(file.buffer);

    return {
      // Store the full secure URL; FileType returns it verbatim for the
      // cloudinary driver (no signing needed for public delivery URLs).
      file: await this.fileRepository.create({
        path: uploaded.secure_url,
      }),
    };
  }

  private uploadBuffer(buffer: Buffer): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'event-ticket', resource_type: 'image' },
        (error, result) => {
          if (error || !result) {
            return reject(
              new UnprocessableEntityException({
                status: HttpStatus.UNPROCESSABLE_ENTITY,
                errors: { file: 'uploadFailed' },
              }),
            );
          }
          resolve(result);
        },
      );
      stream.end(buffer);
    });
  }
}
