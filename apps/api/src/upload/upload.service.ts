import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class UploadService {
  constructor(private configService: ConfigService) {}
  async uploadProfilePicture(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only JPEG, PNG, and WebP images are allowed',
      );
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    try {
      // Configure Cloudinary with environment variables
      const cloudName = this.configService.get(
        'CLOUDINARY_CLOUD_NAME',
      ) as string;
      const apiKey = this.configService.get('CLOUDINARY_API_KEY') as string;
      const apiSecret = this.configService.get(
        'CLOUDINARY_API_SECRET',
      ) as string;

      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });

      // Upload to Cloudinary
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: 'profile-pictures',
              transformation: [
                { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                { quality: 'auto', fetch_format: 'auto' },
              ],
            },
            (error, result) => {
              if (error) {
                reject(error as Error);
              } else {
                resolve(result as UploadApiResponse);
              }
            },
          )
          .end(file.buffer);
      });

      return result.secure_url;
    } catch (error) {
      throw new BadRequestException('Failed to upload image', error as Error);
    }
  }

  async deleteProfilePicture(imageUrl: string): Promise<void> {
    try {
      // Extract public ID from Cloudinary URL
      const publicId = this.extractPublicIdFromUrl(imageUrl);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    } catch (error) {
      // Log error but don't throw - deletion failure shouldn't block the update
      throw new BadRequestException('Failed to delete image', error as Error);
    }
  }

  private extractPublicIdFromUrl(url: string): string | null {
    try {
      const parts = url.split('/');
      const filename = parts[parts.length - 1];
      const publicId = filename.split('.')[0];
      return `profile-pictures/${publicId}`;
    } catch (error) {
      throw new BadRequestException(
        'Failed to extract public ID',
        error as Error,
      );
    }
  }
}
