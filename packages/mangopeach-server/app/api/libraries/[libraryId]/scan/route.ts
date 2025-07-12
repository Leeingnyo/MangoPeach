import { NextResponse } from 'next/server';
import { getInitializedLibraryManager } from '@/lib/core';

export async function POST(
  request: Request,
  { params }: { params: { libraryId: string } }
) {
  try {
    const { libraryId } = params;
    const manager = await getInitializedLibraryManager();
    
    // Check if library exists
    const libraries = await manager.getAllLibraries();
    const library = libraries.find(lib => lib.id === libraryId);
    
    if (!library) {
      return NextResponse.json(
        {
          success: false,
          error: 'Library not found'
        },
        { status: 404 }
      );
    }
    
    // Trigger rescan
    const scanResult = await manager.rescanAndCompare(libraryId);
    
    return NextResponse.json({
      success: true,
      data: {
        libraryId,
        libraryName: library.name,
        scanResult: {
          added: scanResult.added.length,
          updated: scanResult.updated.length,
          moved: scanResult.moved.length,
          deleted: scanResult.deleted.length,
        },
        details: {
          addedItems: scanResult.added.map(item => ({ id: item.id, name: item.name, path: item.path })),
          updatedItems: scanResult.updated.map(item => ({ id: item.id, name: item.name, path: item.path })),
          movedItems: scanResult.moved.map(item => ({ 
            from: { id: item.from.id, name: item.from.name, path: item.from.path },
            to: { id: item.to.id, name: item.to.name, path: item.to.path }
          })),
          deletedItems: scanResult.deleted.map(item => ({ id: item.id, name: item.name, path: item.path }))
        }
      }
    });
    
  } catch (error) {
    console.error('Error rescanning library:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to rescan library'
      },
      { status: 500 }
    );
  }
}