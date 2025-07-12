import { NextResponse } from 'next/server';
import { getInitializedLibraryManager } from '@/lib/core';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const libraryId = url.searchParams.get('libraryId');
    const bundleId = url.searchParams.get('bundleId');
    const bundleType = url.searchParams.get('type') as 'directory' | 'zip' | 'rar' | '7z';
    const pageIndexParam = url.searchParams.get('pageIndex');
    const imagePath = url.searchParams.get('imagePath');
    
    if (!libraryId || !bundleId || !bundleType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: libraryId, bundleId, type'
        },
        { status: 400 }
      );
    }
    
    const manager = await getInitializedLibraryManager();
    const libraryData = await manager.getLibraryData(libraryId);
    
    if (!libraryData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Library not found'
        },
        { status: 404 }
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
      return NextResponse.json(
        {
          success: false,
          error: 'Bundle not found'
        },
        { status: 404 }
      );
    }
    
    // Get the scanner service for this library
    const scanner = manager.getScannerService(libraryId);
    
    if (!scanner) {
      return NextResponse.json(
        {
          success: false,
          error: 'Library scanner not found'
        },
        { status: 404 }
      );
    }
    let imageData: Buffer;
    
    if (imagePath) {
      // Get image by specific path
      imageData = await scanner.getImageDataByPath(bundle.path, bundleType, imagePath);
    } else if (pageIndexParam !== null) {
      // Get image by page index
      const pageIndex = parseInt(pageIndexParam, 10);
      if (isNaN(pageIndex) || pageIndex < 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid pageIndex'
          },
          { status: 400 }
        );
      }
      imageData = await scanner.getImageData(bundle.path, bundleType, pageIndex);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Either pageIndex or imagePath parameter is required'
        },
        { status: 400 }
      );
    }
    
    // Determine content type based on image data
    const getContentType = (buffer: Buffer): string => {
      if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'image/jpeg';
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'image/png';
      if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'image/gif';
      if (buffer[0] === 0x42 && buffer[1] === 0x4D) return 'image/bmp';
      if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return 'image/webp';
      return 'image/jpeg'; // default fallback
    };
    
    const contentType = getContentType(imageData);
    
    return new NextResponse(imageData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
    
  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to serve image'
      },
      { status: 500 }
    );
  }
}