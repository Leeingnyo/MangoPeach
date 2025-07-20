/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useReaderConfig, type ViewMode, type FitMode, type PageDirection, type DualPageLayout } from '@/lib/readerConfig';

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

// Types now imported from readerConfig

export default function BundleViewer({ libraryId, bundleId, bundleDetails }: BundleViewerProps) {
  const router = useRouter();
  const { bundle, images = [] } = bundleDetails || {};
  
  // Reader configuration with localStorage persistence
  const { config, setViewMode, setFitMode, setPageDirection, setDualPageLayout } = useReaderConfig();
  const { viewMode, fitMode, pageDirection, dualPageLayout } = config;
  
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

  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };


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
        return 'h-full w-auto object-contain';
      case 'fit-both':
        return 'w-full h-full object-contain';
      case 'original':
        return 'w-auto h-auto';
      default:
        return 'w-full h-auto';
    }
  };

  const getDualPageContainerClass = () => {
    switch (fitMode) {
      case 'fit-width':
        return 'w-full h-auto';
      case 'fit-height':
        return 'h-full w-auto';
      case 'fit-both':
        return 'max-w-full max-h-full';
      case 'original':
        return 'w-auto h-auto';
      default:
        return 'w-full h-auto max-h-full';
    }
  };

  const getDualPageItemClass = () => {
    switch (fitMode) {
      case 'fit-width':
        return 'w-full';
      case 'fit-height':
        return 'h-full object-contain';
      case 'fit-both':
        return 'max-w-full max-h-full object-contain';
      case 'original':
        return 'w-auto h-auto';
      default:
        return 'w-full h-auto max-h-full';
    }
  };


  const getImageUrl = (pageIndex: number) => {
    return api.images.urlByIndex(libraryId, bundleId, pageIndex);
  };

  // Dual page helper functions
  const getDualPageIndices = useCallback((currentPageIndex: number): number[] => {
    if (!images || images.length === 0) return [];
    
    if (dualPageLayout === 'offset') {
      // Offset: (0), (1, 2), (3, 4), (5, 6)...
      if (currentPageIndex === 0) return [0];
      
      const pairIndex = Math.floor((currentPageIndex - 1) / 2);
      const leftPage = 1 + (pairIndex * 2);
      const rightPage = leftPage + 1;
      
      return rightPage < images.length ? [leftPage, rightPage] : [leftPage];
    } else {
      // Standard: (0, 1), (2, 3), (4, 5)...
      const pairIndex = Math.floor(currentPageIndex / 2);
      const leftPage = pairIndex * 2;
      const rightPage = leftPage + 1;
      
      return rightPage < images.length ? [leftPage, rightPage] : [leftPage];
    }
  }, [images, dualPageLayout]);

  const getNextDualPageIndex = useCallback((currentPageIndex: number): number => {
    if (!images || images.length === 0) return currentPageIndex;
    
    if (dualPageLayout === 'offset') {
      if (currentPageIndex === 0) return 1; // From first single page to first pair
      
      const pairIndex = Math.floor((currentPageIndex - 1) / 2);
      const nextPairStart = 1 + ((pairIndex + 1) * 2);
      
      return Math.min(nextPairStart, images.length - 1);
    } else {
      const pairIndex = Math.floor(currentPageIndex / 2);
      const nextPairStart = (pairIndex + 1) * 2;
      
      return Math.min(nextPairStart, images.length - 1);
    }
  }, [images, dualPageLayout]);

  const getPrevDualPageIndex = useCallback((currentPageIndex: number): number => {
    if (!images || images.length === 0) return currentPageIndex;
    
    if (dualPageLayout === 'offset') {
      if (currentPageIndex <= 1) return 0; // To first single page
      
      const pairIndex = Math.floor((currentPageIndex - 1) / 2);
      const prevPairStart = Math.max(1, 1 + ((pairIndex - 1) * 2));
      
      return prevPairStart;
    } else {
      const pairIndex = Math.floor(currentPageIndex / 2);
      const prevPairStart = Math.max(0, (pairIndex - 1) * 2);
      
      return prevPairStart;
    }
  }, [images, dualPageLayout]);

  const goToPreviousPage = useCallback(() => {
    if (viewMode === 'dual-page') {
      const prevIndex = getPrevDualPageIndex(currentPage);
      if (prevIndex !== currentPage) {
        setCurrentPage(prevIndex);
      }
    } else {
      if (currentPage > 0) {
        setCurrentPage(currentPage - 1);
      }
    }
  }, [viewMode, currentPage, getPrevDualPageIndex]);

  const goToNextPage = useCallback(() => {
    if (viewMode === 'dual-page') {
      const nextIndex = getNextDualPageIndex(currentPage);
      if (nextIndex !== currentPage) {
        setCurrentPage(nextIndex);
      }
    } else {
      if (images && currentPage < images.length - 1) {
        setCurrentPage(currentPage + 1);
      }
    }
  }, [viewMode, currentPage, images, getNextDualPageIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!images || images.length === 0) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          // Respect page direction: LTR = left goes back, RTL = left goes forward
          const goBack = pageDirection === 'ltr';
          if (viewMode === 'page' || viewMode === 'dual-page') {
            if (goBack) {
              goToPreviousPage();
            } else {
              goToNextPage();
            }
          } else if (viewMode === 'scroll') {
            const targetPage = goBack 
              ? (currentPage > 0 ? currentPage - 1 : 0)
              : (currentPage < images.length - 1 ? currentPage + 1 : images.length - 1);
            scrollToPage(targetPage);
          }
          break;
        case 'ArrowRight':
        case 'd':
          // Respect page direction: LTR = right goes forward, RTL = right goes back
          const goForward = pageDirection === 'ltr';
          if (viewMode === 'page' || viewMode === 'dual-page') {
            if (goForward) {
              goToNextPage();
            } else {
              goToPreviousPage();
            }
          } else if (viewMode === 'scroll') {
            const targetPage = goForward 
              ? (currentPage < images.length - 1 ? currentPage + 1 : images.length - 1)
              : (currentPage > 0 ? currentPage - 1 : 0);
            scrollToPage(targetPage);
          }
          break;
        case 'Home':
          if (viewMode === 'page' || viewMode === 'dual-page') {
            setCurrentPage(0);
          } else if (viewMode === 'scroll') {
            scrollToPage(0);
          }
          break;
        case 'End':
          if (viewMode === 'page' || viewMode === 'dual-page') {
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
  }, [currentPage, images, isFullscreen, viewMode, pageDirection, dualPageLayout, goToNextPage, goToPreviousPage]);

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

  // Intersection Observer to track current page in scroll mode
  useEffect(() => {
    if (viewMode !== 'scroll' || !scrollContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const intersectedEntries = entries.filter(entry => entry.isIntersecting);
        if (intersectedEntries.length === 0) return;
        if (!scrollContainerRef.current) return;

        const isEnd = intersectedEntries.at(-1)!.target === scrollContainerRef.current.lastElementChild;
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
        ) : viewMode === 'dual-page' ? (
          // Dual Page Mode
          <div className="relative w-full h-full flex flex-col justify-around items-center overflow-y-auto">
            {images && images.length > 0 ? (
              <>
                <div className={`flex gap-2 ${getDualPageContainerClass()}`}>
                  {getDualPageIndices(currentPage).map((pageIndex, displayIndex) => {
                    const isRightToLeft = pageDirection === 'rtl';
                    const isFirstPage = displayIndex === 0;
                    const isSecondPage = displayIndex === 1;
                    
                    // For RTL, swap display order
                    const shouldShowOnLeft = isRightToLeft ? isSecondPage : isFirstPage;
                    const shouldShowOnRight = isRightToLeft ? isFirstPage : isSecondPage;
                    
                    return (
                      <div 
                        key={pageIndex}
                        className={`flex justify-center items-center ${
                          shouldShowOnLeft ? 'order-1' : shouldShowOnRight ? 'order-2' : ''
                        } ${getDualPageItemClass()}`}
                      >
                        <img
                          src={getImageUrl(pageIndex)}
                          alt={`Page ${pageIndex + 1}`}
                          className="max-w-full max-h-full object-contain"
                          loading="eager"
                          onClick={resetControlsTimer}
                        />
                      </div>
                    );
                  })}
                </div>
                
                {/* Navigation Areas - respect page direction */}
                <div 
                  className="absolute left-0 top-0 w-1/3 h-full cursor-pointer z-10"
                  onClick={pageDirection === 'ltr' ? goToPreviousPage : goToNextPage}
                />
                <div 
                  className="absolute right-0 top-0 w-1/3 h-full cursor-pointer z-10"
                  onClick={pageDirection === 'ltr' ? goToNextPage : goToPreviousPage}
                />
              </>
            ) : (
              <div className="text-white text-center py-8">
                <p>No images found in this bundle</p>
              </div>
            )}
          </div>
        ) : (
          // Single Page Mode
          <div className="relative w-full h-full flex flex-col justify-around items-center overflow-y-auto">
            {images && images.length > 0 ? (
              <>
                <img
                  src={getImageUrl(currentPage)}
                  alt={`Page ${currentPage + 1}`}
                  className={getFitModeClass()}
                  loading="eager"
                  onClick={resetControlsTimer}
                />
                
                {/* Navigation Areas - respect page direction */}
                <div 
                  className="absolute left-0 top-0 w-1/3 h-full cursor-pointer z-10"
                  onClick={pageDirection === 'ltr' ? goToPreviousPage : goToNextPage}
                />
                <div 
                  className="absolute right-0 top-0 w-1/3 h-full cursor-pointer z-10"
                  onClick={pageDirection === 'ltr' ? goToNextPage : goToPreviousPage}
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
                <option value="page">Single Page</option>
                <option value="dual-page">Dual Page</option>
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
            
            <div className="flex items-center space-x-2">
              <span className="text-sm">Direction:</span>
              <select 
                value={pageDirection} 
                onChange={(e) => setPageDirection(e.target.value as PageDirection)}
                className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
              >
                <option value="ltr">Left to Right</option>
                <option value="rtl">Right to Left</option>
              </select>
            </div>
            
            {viewMode === 'dual-page' && (
              <div className="flex items-center space-x-2">
                <span className="text-sm">Layout:</span>
                <select 
                  value={dualPageLayout} 
                  onChange={(e) => setDualPageLayout(e.target.value as DualPageLayout)}
                  className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
                >
                  <option value="standard">Standard (0,1), (2,3)</option>
                  <option value="offset">Offset (0), (1,2), (3,4)</option>
                </select>
              </div>
            )}
          </div>
          
          {(viewMode === 'page' || viewMode === 'dual-page') && (
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