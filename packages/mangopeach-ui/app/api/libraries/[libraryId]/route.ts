import { NextResponse } from 'next/server';
import { getInitializedLibraryManager } from '@/lib/core';

export async function GET(request: Request, { params }: { params: Promise<{ libraryId: string }> }) {
  try {
    const { libraryId } = await params;
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
    
    return NextResponse.json({
      success: true,
      data: libraryData
    });
  } catch (error) {
    console.error('Error fetching library data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch library data'
      },
      { status: 500 }
    );
  }
}