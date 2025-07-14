import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { LibrariesService } from '../libraries/libraries.service';

@Controller('images')
export class ImagesController {
  constructor(private readonly librariesService: LibrariesService) {}

  @Get()
  async getImage(
    @Query('libraryId') libraryId: string,
    @Query('bundleId') bundleId: string,
    @Query('type') bundleType: 'directory' | 'zip' | 'rar' | '7z',
    @Query('pageIndex') pageIndexParam: string,
    @Query('imagePath') imagePath: string,
    @Res() res: Response,
  ) {
    try {
      if (!libraryId || !bundleId || !bundleType) {
        throw new HttpException(
          {
            success: false,
            error: 'Missing required parameters: libraryId, bundleId, type',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const libraryData = await this.librariesService.getLibraryData(libraryId);

      if (!libraryData) {
        throw new HttpException(
          {
            success: false,
            error: 'Library not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // Find the bundle in the library data
      const findBundle = (group: any): any => {
        // Check bundles in current group
        const bundle = group.bundles.find((b: any) => b.id === bundleId);
        if (bundle) return bundle;

        // Check subgroups recursively
        for (const subGroup of group.subGroups) {
          const found = findBundle(subGroup);
          if (found) return found;
        }
        return null;
      };

      const bundle = findBundle(libraryData);
      if (!bundle) {
        throw new HttpException(
          {
            success: false,
            error: 'Bundle not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // Get the scanner service for this library
      const scanner = await this.librariesService.getScannerService(libraryId);

      if (!scanner) {
        throw new HttpException(
          {
            success: false,
            error: 'Library scanner not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      let imageData: Buffer;

      if (imagePath) {
        // Get image by specific path
        imageData = await scanner.getImageDataByPath(bundle.id, imagePath);
      } else if (pageIndexParam !== null && pageIndexParam !== undefined) {
        // Get image by page index
        const pageIndex = parseInt(pageIndexParam, 10);
        if (isNaN(pageIndex) || pageIndex < 0) {
          throw new HttpException(
            {
              success: false,
              error: 'Invalid pageIndex',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
        imageData = await scanner.getImageData(bundle.id, pageIndex);
      } else {
        throw new HttpException(
          {
            success: false,
            error: 'Either pageIndex or imagePath parameter is required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Determine content type based on image data
      const getContentType = (buffer: Buffer): string => {
        if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
        if (
          buffer[0] === 0x89 &&
          buffer[1] === 0x50 &&
          buffer[2] === 0x4e &&
          buffer[3] === 0x47
        )
          return 'image/png';
        if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46)
          return 'image/gif';
        if (buffer[0] === 0x42 && buffer[1] === 0x4d) return 'image/bmp';
        if (
          buffer[0] === 0x52 &&
          buffer[1] === 0x49 &&
          buffer[2] === 0x46 &&
          buffer[3] === 0x46
        )
          return 'image/webp';
        return 'image/jpeg'; // default fallback
      };

      const contentType = getContentType(imageData);

      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      });

      res.send(imageData);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error serving image:', error);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to serve image',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
