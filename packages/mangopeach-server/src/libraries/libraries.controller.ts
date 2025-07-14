import {
  Controller,
  Get,
  Post,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { LibrariesService } from './libraries.service';

@Controller('libraries')
export class LibrariesController {
  constructor(private readonly librariesService: LibrariesService) {}

  @Get()
  async getAllLibraries() {
    try {
      const libraries = await this.librariesService.getAllLibraries();
      return {
        success: true,
        data: libraries,
      };
    } catch (error) {
      console.error('Error fetching libraries:', error);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to fetch libraries',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':libraryId')
  async getLibraryData(@Param('libraryId') libraryId: string) {
    try {
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

      return {
        success: true,
        data: libraryData,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error fetching library data:', error);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to fetch library data',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':libraryId/scan')
  async rescanLibrary(@Param('libraryId') libraryId: string) {
    try {
      await this.librariesService.rescanLibrary(libraryId);

      return {
        success: true,
        message: `Library ${libraryId} rescan initiated.`,
      };
    } catch (error) {
      console.error(`Error initiating library scan for ${libraryId}:`, error);
      throw new HttpException(
        {
          success: false,
          error: 'Failed to initiate library scan',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
