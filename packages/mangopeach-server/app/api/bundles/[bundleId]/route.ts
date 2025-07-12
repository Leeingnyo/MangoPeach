import { NextResponse } from 'next/server';
import { getInitializedLibraryManager } from '@/lib/core';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bundleId: string }> }
) {
  try {
    const { bundleId } = await params;
    const url = new URL(request.url);
    const libraryId = url.searchParams.get('libraryId');
    
    if (!libraryId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: libraryId'
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
    
    try {
      // Get detailed bundle information
      const bundleDetails = await scanner.getBundleDetails(bundle.path, bundle.type);
      
      return NextResponse.json({
        success: true,
        data: {
          id: bundle.id,
          name: bundle.name,
          path: bundle.path,
          type: bundle.type,
          pageCount: bundle.pageCount,
          modifiedAt: bundle.modifiedAt,
          libraryId: bundle.libraryId,
          fileId: bundle.fileId,
          images: bundleDetails.images.map((img: any, index: number) => ({
            index,
            path: img.path,
            name: img.name,
            size: img.size
          }))
        }
      });
    } catch (error) {
      console.error('Error getting bundle details:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get bundle details'
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error fetching bundle:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bundle'
      },
      { status: 500 }
    );
  }
}