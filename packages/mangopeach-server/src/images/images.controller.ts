import {
  Controller,
  Get,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { LibrariesService } from '../libraries/libraries.service';

@Controller('libraries/:libraryId/bundles/:bundleId/images')
export class ImagesController {
  constructor(private readonly librariesService: LibrariesService) {}

  @Get(':imageId')
  async getImageById(
    @Param('libraryId') libraryId: string,
    @Param('bundleId') bundleId: string,
    @Param('imageId') imageId: string,
    @Res() res: Response,
  ) {
    try {
      // Parse imageId as pageIndex (for now, keeping it simple)
      const pageIndex = parseInt(imageId, 10);
      if (isNaN(pageIndex) || pageIndex < 0) {
        throw new HttpException(
          {
            success: false,
            error: 'Invalid imageId - must be a valid page index',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      return this.getImageInternal(libraryId, bundleId, pageIndex, undefined, res);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error serving image by ID:', error);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to serve image',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async getImage(
    @Param('libraryId') libraryId: string,
    @Param('bundleId') bundleId: string,
    @Query('pageIndex') pageIndexParam: string,
    @Query('imagePath') imagePath: string,
    @Res() res: Response,
  ) {
    try {
      let pageIndex: number | undefined;
      
      if (pageIndexParam !== null && pageIndexParam !== undefined) {
        pageIndex = parseInt(pageIndexParam, 10);
        if (isNaN(pageIndex) || pageIndex < 0) {
          throw new HttpException(
            {
              success: false,
              error: 'Invalid pageIndex',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      return this.getImageInternal(libraryId, bundleId, pageIndex, imagePath, res);
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

  private async getImageInternal(
    libraryId: string,
    bundleId: string,
    pageIndex: number | undefined,
    imagePath: string | undefined,
    res: Response,
  ) {
    try {
      // Get the bundle directly since we have the bundleId from the path
      const bundle = await this.librariesService.getBundle(bundleId);
      
      if (!bundle) {
        throw new HttpException(
          {
            success: false,
            error: 'Bundle not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // Validate that the bundle belongs to the specified library
      if (bundle.libraryId !== libraryId) {
        throw new HttpException(
          {
            success: false,
            error: `Bundle ${bundleId} does not belong to library ${libraryId}`,
          },
          HttpStatus.BAD_REQUEST,
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
      } else if (pageIndex !== undefined) {
        // Get image by page index
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
