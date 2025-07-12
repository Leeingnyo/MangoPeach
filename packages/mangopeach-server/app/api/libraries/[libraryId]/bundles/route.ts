import { NextResponse } from 'next/server';
import { getInitializedLibraryManager } from '@/lib/core';

export async function GET(
  request: Request,
  { params }: { params: { libraryId: string } }
) {
  try {
    const { libraryId } = params;
    const url = new URL(request.url);
    const groupPath = url.searchParams.get('groupPath') || '';
    
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
    
    // Navigate to the requested group if groupPath is provided
    let currentGroup = libraryData;
    if (groupPath) {
      const pathParts = groupPath.split('/').filter(Boolean);
      for (const part of pathParts) {
        const subGroup = currentGroup.subGroups.find(g => g.name === part);
        if (!subGroup) {
          return NextResponse.json(
            {
              success: false,
              error: 'Group not found'
            },
            { status: 404 }
          );
        }
        currentGroup = subGroup;
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        bundles: currentGroup.bundles,
        subGroups: currentGroup.subGroups.map(sg => ({
          name: sg.name,
          path: sg.path,
          bundleCount: sg.bundles.length,
          subGroupCount: sg.subGroups.length
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching library bundles:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch library bundles'
      },
      { status: 500 }
    );
  }
}