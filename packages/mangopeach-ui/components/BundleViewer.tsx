'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Bundle {
  id: string;
  name: string;
  type: string;
  path: string;
  libraryId: string;
  pageCount: number;
  coverImage?: string;
  tags: string[];
  createdAt: string;
  modifiedAt: string;
}

interface BundleDetails {
  bundle: Bundle;
  images: string[];
}

interface BundleViewerProps {
  libraryId: string;
  bundleId: string;
  bundleDetails?: BundleDetails;
}

type ViewMode = 'scroll' | 'page';
type FitMode = 'fit-width' | 'fit-height' | 'fit-both' | 'original';

export default function BundleViewer({ libraryId, bundleId, bundleDetails }: BundleViewerProps) {
  const router = useRouter();
  const { bundle, images = [] } = bundleDetails || {};
  
  const [viewMode, setViewMode] = useState<ViewMode>('scroll');
  const [fitMode, setFitMode] = useState<FitMode>('fit-width');
  const [currentPage, setCurrentPage] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [scrollPending, setScrollPending] = useState(false);
  
  const viewerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Virtual scrolling settings
  const BUFFER_SIZE = 5; // Load 5 images before and after current view

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    const resetControlsTimer = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [currentPage, viewMode, fitMode]);

  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!images || images.length === 0) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      resetControlsTimer(); // Show controls on keyboard interaction
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          if (viewMode === 'page' && currentPage > 0) {
            setCurrentPage(currentPage - 1);
          } else if (viewMode === 'scroll') {
            // Scroll to current page in scroll mode
            scrollToPage(currentPage > 0 ? currentPage - 1 : 0);
          }
          break;
        case 'ArrowRight':
        case 'd':
          if (viewMode === 'page' && currentPage < images.length - 1) {
            setCurrentPage(currentPage + 1);
          } else if (viewMode === 'scroll') {
            // Scroll to current page in scroll mode
            scrollToPage(currentPage < images.length - 1 ? currentPage + 1 : images.length - 1);
          }
          break;
        case 'Home':
          if (viewMode === 'page') {
            setCurrentPage(0);
          } else if (viewMode === 'scroll') {
            scrollToPage(0);
          }
          break;
        case 'End':
          if (viewMode === 'page') {
            setCurrentPage(images.length - 1);
          } else if (viewMode === 'scroll') {
            scrollToPage(images.length - 1);
          }
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) {
            exitFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, images, isFullscreen, viewMode]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getFitModeClass = () => {
    switch (fitMode) {
      case 'fit-width':
        return 'w-full h-auto';
      case 'fit-height':
        return 'h-full w-auto';
      case 'fit-both':
        return 'w-full h-full object-contain';
      case 'original':
        return 'w-auto h-auto';
      default:
        return 'w-full h-auto';
    }
  };

  const getImageUrl = (pageIndex: number) => {
    return api.images.urlByIndex(libraryId, bundleId, pageIndex);
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (images && currentPage < images.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPage = (pageNumber: number) => {
    if (images && pageNumber >= 0 && pageNumber < images.length) {
      setCurrentPage(pageNumber);
      if (viewMode === 'scroll') {
        scrollToPage(pageNumber);
      }
    }
  };

  const scrollToPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    setScrollPending(true);
  };

  useLayoutEffect(() => {
    if (!scrollPending) return;
    setScrollPending(false);

    requestAnimationFrame(() => {
    if (!scrollContainerRef.current) return;

    const imageElement = scrollContainerRef.current.querySelector(`[data-page="${currentPage}"]`);
    if (imageElement) {
      imageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    });
  }, [scrollPending, currentPage]);

  // Load images around current page for virtual scrolling
  const getImagesToLoad = (centerPage: number, totalImages: number): Set<number> => {
    const imagesToLoad = new Set<number>();
    const start = Math.max(0, centerPage - BUFFER_SIZE);
    const end = Math.min(totalImages - 1, centerPage + BUFFER_SIZE);
    
    for (let i = start; i <= end; i++) {
      imagesToLoad.add(i);
    }
    return imagesToLoad;
  };

  // Update loaded images when current page changes
  useEffect(() => {
    if (images && images.length > 0) {
      const newLoadedImages = getImagesToLoad(currentPage, images.length);
      setLoadedImages(newLoadedImages);
    }
  }, [currentPage, images]);

  // Initialize with first page loaded
  /*
  useEffect(() => {
    if (images && images.length > 0) {
      const initialLoadedImages = getImagesToLoad(0, images.length);
      setLoadedImages(initialLoadedImages);
    }
  }, [images]);
  */

  // Intersection Observer to track current page in scroll mode
  useEffect(() => {
    if (viewMode !== 'scroll' || !scrollContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const intersectedEntries = entries.filter(entry => entry.isIntersecting);
        if (intersectedEntries.length === 0) return;

        const isEnd = intersectedEntries.at(-1)!.target === (scrollContainerRef.current as HTMLElement).lastElementChild;
        if (isEnd) {
          setCurrentPage(images.length - 1);
          return;
        }
        const middle = intersectedEntries[Math.floor((intersectedEntries.length - 1) / 2)];
        const pageIndex = parseInt(middle.target.getAttribute('data-page') || '0');
        setCurrentPage(pageIndex);
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '-40% 0px -60% 0px',
        // threshold: 0.5,
      }
    );

    // Observe all page elements
    const pageElements = scrollContainerRef.current.querySelectorAll('[data-page]');
    pageElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [viewMode, images]);

  // Show loading state if bundle data is not available
  if (!bundle) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading bundle...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={viewerRef}
      className={`relative w-full h-screen bg-black overflow-hidden ${isFullscreen ? 'fullscreen' : ''}`}
      onClick={resetControlsTimer}
    >
      {/* Top Controls */}
      <div className={`absolute top-0 left-0 right-0 z-50 bg-black bg-opacity-75 text-white p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
            <h1 className="text-lg font-semibold truncate max-w-md">{bundle?.name || 'Loading...'}</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm">
              {currentPage + 1} / {images?.length || 0}
            </span>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewer */}
      <div className="w-full h-full flex items-center justify-center">
        {viewMode === 'scroll' ? (
          // Scroll Mode with Virtual Scrolling
          <div 
            ref={scrollContainerRef}
            className="w-full h-full overflow-y-auto overflow-x-hidden"
          >
            <div className="flex flex-col items-center space-y-2 p-4">
              {images && images.length > 0 ? (
                images.map((_, index) => (
                  <div 
                    key={index} 
                    className="w-full flex justify-center min-h-[200px]"
                    data-page={index}
                  >
                    {loadedImages.has(index) ? (
                      <img
                        src={getImageUrl(index)}
                        alt={`Page ${index + 1}`}
                        className={getFitModeClass()}
                        loading="lazy"
                        onClick={() => {
                          setCurrentPage(index);
                          resetControlsTimer();
                        }}
                      />
                    ) : (
                      <div className="w-full h-[600px] bg-gray-800 flex items-center justify-center text-white">
                        <div className="text-center">
                          <div className="animate-pulse mb-2">📖</div>
                          <p>Page {index + 1}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-white text-center py-8">
                  <p>No images found in this bundle</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Page Mode
          <div className="relative w-full h-full flex flex-col items-center overflow-y-auto">
            {images && images.length > 0 ? (
              <>
                <img
                  src={getImageUrl(currentPage)}
                  alt={`Page ${currentPage + 1}`}
                  className={getFitModeClass()}
                  loading="eager"
                  onClick={resetControlsTimer}
                />
                
                {/* Navigation Areas */}
                <div 
                  className="absolute left-0 top-0 w-1/3 h-full cursor-pointer z-10"
                  onClick={goToPreviousPage}
                />
                <div 
                  className="absolute right-0 top-0 w-1/3 h-full cursor-pointer z-10"
                  onClick={goToNextPage}
                />
              </>
            ) : (
              <div className="text-white text-center py-8">
                <p>No images found in this bundle</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className={`absolute bottom-0 left-0 right-0 z-50 bg-black bg-opacity-75 text-white p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm">View:</span>
              <select 
                value={viewMode} 
                onChange={(e) => setViewMode(e.target.value as ViewMode)}
                className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
              >
                <option value="scroll">Scroll</option>
                <option value="page">Page</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm">Fit:</span>
              <select 
                value={fitMode} 
                onChange={(e) => setFitMode(e.target.value as FitMode)}
                className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
              >
                <option value="fit-width">Fit Width</option>
                <option value="fit-height">Fit Height</option>
                <option value="fit-both">Fit Both</option>
                <option value="original">Original</option>
              </select>
            </div>
          </div>
          
          {viewMode === 'page' && (
            <div className="flex items-center space-x-4">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 0}
                className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, (images?.length || 1) - 1)}
                  value={currentPage}
                  onKeyDown={e => e.stopPropagation()}
                  onChange={(e) => goToPage(parseInt(e.target.value))}
                  className="w-32"
                />
                <input
                  type="number"
                  min="1"
                  max={images?.length || 1}
                  value={currentPage + 1}
                  onChange={(e) => goToPage(parseInt(e.target.value) - 1)}
                  className="w-16 bg-gray-700 text-white px-2 py-1 rounded text-sm"
                />
              </div>
              
              <button
                onClick={goToNextPage}
                disabled={!images || currentPage === images.length - 1}
                className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}