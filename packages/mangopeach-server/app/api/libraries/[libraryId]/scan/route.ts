import { NextRequest, NextResponse } from 'next/server';
import { getInitializedLibraryManager } from '@/lib/core';

export async function POST(request: NextRequest, { params }: { params: Promise<{ libraryId: string }> }) {
  try {
    const { libraryId } = await params;
    const manager = await getInitializedLibraryManager();
    await manager.rescanLibrary(libraryId);
    
    return NextResponse.json({
      success: true,
      message: `Library ${libraryId} rescan initiated.`
    });
  } catch (error) {
    const { libraryId } = await params;
    console.error(`Error initiating library scan for ${libraryId}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initiate library scan'
      },
      { status: 500 }
    );
  }
}
