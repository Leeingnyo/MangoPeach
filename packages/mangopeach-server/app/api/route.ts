import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'MangoPeach API',
    version: '1.0.0',
    endpoints: {
      libraries: {
        'GET /api/libraries': 'Get all libraries',
        'GET /api/libraries/{libraryId}': 'Get library data by ID',
        'GET /api/libraries/{libraryId}/bundles?groupPath={path}': 'Get bundles in library or specific group',
        'POST /api/libraries/{libraryId}/scan': 'Rescan library for changes'
      },
      bundles: {
        'GET /api/bundles/{bundleId}?libraryId={libraryId}': 'Get bundle details including image list'
      },
      images: {
        'GET /api/images?libraryId={id}&bundleId={id}&type={type}&pageIndex={index}': 'Serve image by page index',
        'GET /api/images?libraryId={id}&bundleId={id}&type={type}&imagePath={path}': 'Serve image by path'
      }
    },
    supportedBundleTypes: ['directory', 'zip', 'rar', '7z'],
    examples: {
      getLibraries: '/api/libraries',
      getLibraryData: '/api/libraries/my-library-id',
      getBundles: '/api/libraries/my-library-id/bundles',
      getBundlesInGroup: '/api/libraries/my-library-id/bundles?groupPath=manga/series1',
      getBundleDetails: '/api/bundles/bundle-123?libraryId=my-library-id',
      getImageByIndex: '/api/images?libraryId=my-lib&bundleId=bundle-123&type=zip&pageIndex=0',
      getImageByPath: '/api/images?libraryId=my-lib&bundleId=bundle-123&type=directory&imagePath=page001.jpg',
      rescanLibrary: 'POST /api/libraries/my-library-id/scan'
    }
  });
}