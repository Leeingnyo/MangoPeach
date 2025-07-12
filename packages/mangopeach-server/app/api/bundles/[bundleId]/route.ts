import { NextRequest, NextResponse } from 'next/server';
import { getInitializedLibraryManager } from '@/lib/core';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bundleId: string }> }
) {
  try {
    const { bundleId } = await params;
    const manager = await getInitializedLibraryManager();
    const bundle = await manager.dataStore.getBundle(bundleId);

    if (!bundle) {
      return NextResponse.json(
        { success: false, error: `Bundle with ID ${bundleId} not found` },
        { status: 404 }
      );
    }

    const scanner = manager.getScannerService(bundle.libraryId);

    if (!scanner) {
      return NextResponse.json(
        { success: false, error: `Scanner for library ${bundle.libraryId} not found` },
        { status: 404 }
      );
    }

    const bundleDetails = await scanner.getBundleDetails(bundleId);
    
    return NextResponse.json({
      success: true,
      data: bundleDetails
    });
  } catch (error) {
    const { bundleId } = await params;
    console.error(`Error fetching bundle details for ${bundleId}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bundle details'
      },
      { status: 500 }
    );
  }
}
