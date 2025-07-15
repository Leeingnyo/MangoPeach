import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getApiInfo() {
    return {
      success: true,
      message: 'MangoPeach API - Manga/Comic Library Management System',
      version: '2.0.0',
      description: 'RESTful API for managing manga and comic libraries with hierarchical organization',
      endpoints: {
        libraries: {
          'GET /libraries': 'Get all libraries',
          'GET /libraries/{libraryId}': 'Get contents of library root directory',
          'GET /libraries/{libraryId}?parentId={groupId}': 'Get contents of specific group/folder',
          'POST /libraries/{libraryId}/scan': 'Rescan library for changes',
        },
        bundles: {
          'GET /libraries/{libraryId}/bundles/{bundleId}': 'Get bundle details including image list',
        },
        images: {
          'GET /libraries/{libraryId}/bundles/{bundleId}/images': 'Get image with query parameters',
          'GET /libraries/{libraryId}/bundles/{bundleId}/images?pageIndex={index}': 'Get image by page index',
          'GET /libraries/{libraryId}/bundles/{bundleId}/images?imagePath={path}': 'Get image by file path',
          'GET /libraries/{libraryId}/bundles/{bundleId}/images/{imageId}': 'Get image by ID (page index)',
        },
      },
      supportedBundleTypes: ['directory', 'zip', 'rar', '7z'],
      dataStructure: {
        library: 'Top-level manga/comic library',
        group: 'Folder/directory that organizes bundles',
        bundle: 'Individual manga/comic (directory with images or archive file)',
        image: 'Individual page/image within a bundle',
      },
      examples: {
        getLibraries: '/libraries',
        getLibraryContents: '/libraries/abc123',
        getFolderContents: '/libraries/abc123?parentId=def456',
        getBundleDetails: '/libraries/abc123/bundles/xyz789',
        getImageByIndex: '/libraries/abc123/bundles/xyz789/images?pageIndex=0',
        getImageByPath: '/libraries/abc123/bundles/xyz789/images?imagePath=page001.jpg',
        getImageById: '/libraries/abc123/bundles/xyz789/images/0',
        rescanLibrary: 'POST /libraries/abc123/scan',
      },
      navigationFlow: [
        '1. GET /libraries → List all libraries',
        '2. GET /libraries/{libraryId} → Get root contents (groups & bundles)',
        '3. GET /libraries/{libraryId}?parentId={groupId} → Navigate into folders',
        '4. GET /libraries/{libraryId}/bundles/{bundleId} → Get bundle details',
        '5. GET /libraries/{libraryId}/bundles/{bundleId}/images/{imageId} → View images',
      ],
    };
  }
}
