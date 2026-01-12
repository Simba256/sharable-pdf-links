'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import { useRouter } from 'next/navigation'
import { useVirtualizer } from '@tanstack/react-virtual'
import PDFControls from './PDFControls'
import SearchBar from './SearchBar'
import { getPdfConfig } from '@/config/pdfs'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PDFViewerProps {
  pdfName: string
  initialPage: number
}

export default function PDFViewer({ pdfName, initialPage }: PDFViewerProps) {
  const router = useRouter()
  const pdfConfig = getPdfConfig(pdfName)

  if (!pdfConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">PDF not found</div>
      </div>
    )
  }

  const PDF_PATH = pdfConfig.file
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageWidth, setPageWidth] = useState<number>(800)
  const [scale, setScale] = useState<number>(1.0)
  const [zoomMode, setZoomMode] = useState<'custom' | 'fit-width' | 'fit-page' | 'auto'>('auto')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [matchCount, setMatchCount] = useState(0)
  const [currentPage, setCurrentPage] = useState<number>(initialPage)
  const [pageHeights, setPageHeights] = useState<Map<number, number>>(new Map())
  const pdfDocumentRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isNavigating = useRef(false)
  const hasScrolledToInitialPage = useRef(false)

  // Calculate page width based on zoom mode
  const calculatePageWidth = useCallback(() => {
    const containerWidth = containerRef.current?.clientWidth || window.innerWidth
    const availableWidth = containerWidth - 64

    if (zoomMode === 'fit-width' || zoomMode === 'auto') {
      return Math.min(availableWidth, 1200)
    } else {
      if (containerWidth < 640) {
        return containerWidth - 32
      } else if (containerWidth < 1024) {
        return Math.min(600, containerWidth - 64)
      } else {
        return Math.min(800, containerWidth - 128)
      }
    }
  }, [zoomMode])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setPageWidth(calculatePageWidth())
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [calculatePageWidth])

  // TanStack Virtualizer
  const virtualizer = useVirtualizer({
    count: numPages || 0,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => {
      const height = pageHeights.get(index + 1)
      return height ? height * scale + 16 : 800 * scale + 16 // 16px gap
    },
    overscan: 2,
  })

  const onDocumentLoadSuccess = useCallback(async (pdf: any) => {
    setNumPages(pdf.numPages)
    pdfDocumentRef.current = pdf
    setIsLoading(false)
    setError(null)

    // Pre-cache page dimensions
    try {
      const promises = Array.from({ length: pdf.numPages }, (_, i) => pdf.getPage(i + 1))
      const pages = await Promise.all(promises)

      const dimensions = new Map<number, number>()
      pages.forEach((page) => {
        const height = page.view[3] * (pageWidth / page.view[2])
        dimensions.set(page.pageNumber, height)
      })

      setPageHeights(dimensions)
    } catch (err) {
      console.error('Error caching page dimensions:', err)
    }
  }, [pageWidth])

  // Scroll to initial page once virtualizer is ready
  useEffect(() => {
    if (!hasScrolledToInitialPage.current && numPages && pageHeights.size > 0) {
      // If we're already on page 1, just mark as scrolled and enable tracking
      if (initialPage === 1) {
        hasScrolledToInitialPage.current = true
        return
      }

      // For other pages, calculate offset and scroll
      if (initialPage <= numPages && containerRef.current) {
        // Calculate offset to scroll to
        let offset = 0
        for (let i = 1; i < initialPage; i++) {
          const height = pageHeights.get(i) || 800
          offset += height * scale + 16 // 16px gap
        }

        // Set state and flags
        hasScrolledToInitialPage.current = true
        isNavigating.current = true
        setCurrentPage(initialPage)

        // Scroll directly using the container
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = offset

            // Allow tracking to resume after scroll settles
            setTimeout(() => {
              isNavigating.current = false
            }, 1000)
          }
        })
      }
    }
  }, [numPages, pageHeights.size, initialPage, scale])

  function onDocumentLoadError(error: Error) {
    console.error('Error loading PDF:', error)
    setError('Failed to load PDF. Please refresh the page.')
    setIsLoading(false)
  }

  // Search functionality
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)

    if (!query || !pdfDocumentRef.current) {
      setMatchCount(0)
      return
    }

    setIsSearching(true)

    try {
      let totalMatches = 0
      const searchLower = query.toLowerCase()
      const pdf = pdfDocumentRef.current

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .toLowerCase()

        const matches = pageText.split(searchLower).length - 1
        totalMatches += matches
      }

      setMatchCount(totalMatches)
      setIsSearching(false)
    } catch (error) {
      console.error('Search error:', error)
      setMatchCount(0)
      setIsSearching(false)
    }
  }, [])

  // Track visible page for URL updates
  useEffect(() => {
    // Don't track if navigating or if we haven't completed initial scroll yet
    if (!virtualizer || isNavigating.current || !hasScrolledToInitialPage.current) return

    const items = virtualizer.getVirtualItems()
    if (items.length === 0) return

    // Find the page closest to the viewport center
    const container = containerRef.current
    if (!container) return

    const viewportCenter = container.scrollTop + container.clientHeight / 2

    let closestPage = items[0].index + 1
    let minDistance = Math.abs(items[0].start - viewportCenter)

    items.forEach((item) => {
      const distance = Math.abs(item.start - viewportCenter)
      if (distance < minDistance) {
        minDistance = distance
        closestPage = item.index + 1
      }
    })

    if (closestPage !== currentPage) {
      setCurrentPage(closestPage)
      router.replace(`/${pdfName}/${closestPage}`, { scroll: false })
    }
  }, [virtualizer.scrollOffset, currentPage, router, pdfName])

  // Navigation functions
  const goToPage = useCallback((pageNum: number) => {
    if (numPages && pageNum >= 1 && pageNum <= numPages) {
      isNavigating.current = true
      setCurrentPage(pageNum)

      virtualizer.scrollToIndex(pageNum - 1, {
        align: 'start',
        behavior: 'smooth',
      })

      router.push(`/${pdfName}/${pageNum}`, { scroll: false })

      setTimeout(() => {
        isNavigating.current = false
      }, 1000)
    }
  }, [numPages, virtualizer, router, pdfName])

  const nextPage = useCallback(() => {
    if (numPages && currentPage < numPages) {
      goToPage(currentPage + 1)
    }
  }, [currentPage, numPages, goToPage])

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      goToPage(currentPage - 1)
    }
  }, [currentPage, goToPage])

  // Zoom functions
  const zoomIn = () => {
    setZoomMode('custom')
    setScale(prev => Math.min(prev + 0.2, 3.0))
  }

  const zoomOut = () => {
    setZoomMode('custom')
    setScale(prev => Math.max(prev - 0.2, 0.5))
  }

  const resetZoom = () => {
    setZoomMode('auto')
    setScale(1.0)
  }

  const setFitToWidth = () => {
    setZoomMode('fit-width')
    setScale(1.0)
    setPageWidth(calculatePageWidth())
  }

  const setFitToPage = () => {
    setZoomMode('fit-page')
    const containerHeight = window.innerHeight - 180
    const containerWidth = calculatePageWidth()
    const heightScale = containerHeight / (containerWidth * 1.4)
    setScale(Math.min(heightScale, 1.0))
  }

  const setActualSize = () => {
    setZoomMode('custom')
    setScale(1.0)
    setPageWidth(calculatePageWidth())
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        previousPage()
      } else if (e.key === 'ArrowRight' && numPages && currentPage < numPages) {
        nextPage()
      } else if (e.key === '+' || e.key === '=') {
        zoomIn()
      } else if (e.key === '-' || e.key === '_') {
        zoomOut()
      } else if (e.key === '0') {
        resetZoom()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, numPages, previousPage, nextPage])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-2">Error</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-900">{pdfConfig.title}</h1>
        </div>
      </header>

      {/* Search Bar */}
      <SearchBar
        onSearch={handleSearch}
        isSearching={isSearching}
        matchCount={matchCount}
      />

      {/* PDF Document */}
      <div ref={containerRef} className="flex-1 overflow-auto pb-20 pt-6">
        <div className="max-w-7xl mx-auto px-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">Loading PDF...</div>
            </div>
          )}

          <Document
            file={PDF_PATH}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-600">Loading document...</div>
              </div>
            }
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const pageNumber = virtualRow.index + 1

                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="flex justify-center mb-4"
                  >
                    <div className="shadow-lg">
                      <Page
                        pageNumber={pageNumber}
                        width={pageWidth}
                        scale={scale}
                        loading={
                          <div
                            className="flex items-center justify-center bg-gray-100"
                            style={{
                              width: pageWidth * scale,
                              height: (pageHeights.get(pageNumber) || 800) * scale,
                            }}
                          >
                            <div className="text-gray-600">Loading page {pageNumber}...</div>
                          </div>
                        }
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Document>
        </div>
      </div>

      {/* Controls */}
      {numPages && (
        <PDFControls
          currentPage={currentPage}
          totalPages={numPages}
          onPreviousPage={previousPage}
          onNextPage={nextPage}
          onGoToPage={goToPage}
          canGoPrevious={currentPage > 1}
          canGoNext={currentPage < numPages}
          scale={scale}
          zoomMode={zoomMode}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          onFitToWidth={setFitToWidth}
          onFitToPage={setFitToPage}
          onActualSize={setActualSize}
        />
      )}
    </div>
  )
}
