import { NextRequest, NextResponse } from 'next/server';
import { getInitializedLibraryManager } from '@/lib/core';

export async function GET() {
  try {
    const manager = await getInitializedLibraryManager();
    const libraries = await manager.getAllLibraries();
    
    return NextResponse.json({
      success: true,
      data: libraries
    });
  } catch (error) {
    console.error('Error fetching libraries:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch libraries'
      },
      { status: 500 }
    );
  }
}