import {
  Controller,
  Get,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { LibrariesService } from '../libraries/libraries.service';

@Controller('libraries/:libraryId/bundles')
export class BundlesController {
  constructor(private readonly librariesService: LibrariesService) {}

  @Get(':bundleId')
  async getBundleDetails(
    @Param('libraryId') libraryId: string,
    @Param('bundleId') bundleId: string,
  ) {
    try {
      const bundle = await this.librariesService.getBundle(bundleId);

      if (!bundle) {
        throw new HttpException(
          { success: false, error: `Bundle with ID ${bundleId} not found` },
          HttpStatus.NOT_FOUND,
        );
      }

      // Validate that the bundle belongs to the specified library
      if (bundle.libraryId !== libraryId) {
        throw new HttpException(
          { success: false, error: `Bundle ${bundleId} does not belong to library ${libraryId}` },
          HttpStatus.BAD_REQUEST,
        );
      }

      const scanner = await this.librariesService.getScannerService(
        bundle.libraryId,
      );

      if (!scanner) {
        throw new HttpException(
          {
            success: false,
            error: `Scanner for library ${bundle.libraryId} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const bundleDetails = await scanner.getBundleDetails(bundleId);

      return {
        success: true,
        data: bundleDetails,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error(`Error fetching bundle details for ${bundleId}:`, error);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to fetch bundle details',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
