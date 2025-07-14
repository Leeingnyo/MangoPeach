import {
  Controller,
  Get,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { LibrariesService } from '../libraries/libraries.service';

@Controller('bundles')
export class BundlesController {
  constructor(private readonly librariesService: LibrariesService) {}

  @Get(':bundleId')
  async getBundleDetails(@Param('bundleId') bundleId: string) {
    try {
      const bundle = await this.librariesService.getBundle(bundleId);

      if (!bundle) {
        throw new HttpException(
          { success: false, error: `Bundle with ID ${bundleId} not found` },
          HttpStatus.NOT_FOUND,
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
