import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getApiInfo() {
    return {
      success: true,
      message: 'MangoPeach API',
      version: '1.0.0',
      endpoints: {
        libraries: {
          'GET /libraries': 'Get all libraries',
          'GET /libraries/{libraryId}': 'Get library data by ID',
          'GET /libraries/{libraryId}/bundles?groupPath={path}':
            'Get bundles in library or specific group',
          'POST /libraries/{libraryId}/scan': 'Rescan library for changes',
        },
        bundles: {
          'GET /bundles/{bundleId}?libraryId={libraryId}':
            'Get bundle details including image list',
        },
        images: {
          'GET /images?libraryId={id}&bundleId={id}&type={type}&pageIndex={index}':
            'Serve image by page index',
          'GET /images?libraryId={id}&bundleId={id}&type={type}&imagePath={path}':
            'Serve image by path',
        },
      },
      supportedBundleTypes: ['directory', 'zip', 'rar', '7z'],
      examples: {
        getLibraries: '/libraries',
        getLibraryData: '/libraries/my-library-id',
        getBundles: '/libraries/my-library-id/bundles',
        getBundlesInGroup:
          '/libraries/my-library-id/bundles?groupPath=manga/series1',
        getBundleDetails: '/bundles/bundle-123?libraryId=my-library-id',
        getImageByIndex:
          '/images?libraryId=my-lib&bundleId=bundle-123&type=zip&pageIndex=0',
        getImageByPath:
          '/images?libraryId=my-lib&bundleId=bundle-123&type=directory&imagePath=page001.jpg',
        rescanLibrary: 'POST /libraries/my-library-id/scan',
      },
    };
  }
}
