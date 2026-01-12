'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import { useRouter } from 'next/navigation'
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
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([initialPage]))
  const [pageHeight, setPageHeight] = useState<number>(0)
  const pdfDocumentRef = useRef<any>(null)
  const pageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})
  const isScrollingToPage = useRef(false)
  const isInitialLoad = useRef(true)
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll to specific page
  const scrollToPage = useCallback((pageNum: number) => {
    const pageElement = pageRefs.current[pageNum]
    if (pageElement) {
      isScrollingToPage.current = true
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTimeout(() => {
        isScrollingToPage.current = false
        isInitialLoad.current = false
      }, 1500) // Increased timeout to prevent premature observer triggers
    }
  }, [])

  // Navigation functions
  const goToPage = useCallback((pageNum: number) => {
    if (numPages && pageNum >= 1 && pageNum <= numPages) {
      // Immediately load pages around the target
      const buffer = 2
      const pagesToLoad = new Set<number>()
      for (let i = Math.max(1, pageNum - buffer); i <= Math.min(numPages, pageNum + buffer); i++) {
        pagesToLoad.add(i)
      }
      setVisiblePages(pagesToLoad)
      setCurrentPage(pageNum)

      // Scroll to page
      scrollToPage(pageNum)

      // Update URL
      router.push(`/${pdfName}/${pageNum}`, { scroll: false })
    }
  }, [numPages, scrollToPage, router, pdfName])

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

  // Calculate page width based on zoom mode
  const calculatePageWidth = useCallback(() => {
    const containerWidth = containerRef.current?.clientWidth || window.innerWidth
    const availableWidth = containerWidth - 64 // Account for padding

    if (zoomMode === 'fit-width' || zoomMode === 'auto') {
      return Math.min(availableWidth, 1200) // Max 1200px for readability
    } else {
      // For custom/fit-page, use responsive sizing
      if (containerWidth < 640) {
        return containerWidth - 32
      } else if (containerWidth < 1024) {
        return Math.min(600, containerWidth - 64)
      } else {
        return Math.min(800, containerWidth - 128)
      }
    }
  }, [zoomMode])

  // Handle window resize for responsive width
  useEffect(() => {
    const handleResize = () => {
      setPageWidth(calculatePageWidth())
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [calculatePageWidth])

  const onDocumentLoadSuccess = useCallback((pdf: any) => {
    setNumPages(pdf.numPages)
    pdfDocumentRef.current = pdf
    setIsLoading(false)
    setError(null)

    // Calculate approximate page height for placeholders
    const estimatedPageHeight = pageWidth * 1.4 // Typical A4 ratio
    setPageHeight(estimatedPageHeight)

    // Load initial pages with larger buffer
    const pagesToLoad = new Set<number>()
    const buffer = 3
    for (let i = Math.max(1, initialPage - buffer); i <= Math.min(pdf.numPages, initialPage + buffer); i++) {
      pagesToLoad.add(i)
    }
    setVisiblePages(pagesToLoad)

    // Scroll to initial page from URL
    if (initialPage > 1 && initialPage <= pdf.numPages) {
      // Use a shorter delay to scroll faster
      setTimeout(() => {
        scrollToPage(initialPage)
      }, 300)
    } else {
      // If page 1, mark initial load as complete
      setTimeout(() => {
        isInitialLoad.current = false
      }, 500)
    }
  }, [initialPage, scrollToPage, pageWidth])

  function onDocumentLoadError(error: Error) {
    console.error('Error loading PDF:', error)
    setError('Failed to load PDF. Please refresh the page.')
    setIsLoading(false)
  }

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

      // Search through all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .toLowerCase()

        // Count occurrences in this page
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
    const containerHeight = window.innerHeight - 180 // Account for header/footer
    const containerWidth = calculatePageWidth()
    const heightScale = containerHeight / (containerWidth * 1.4) // Assuming A4 ratio
    setScale(Math.min(heightScale, 1.0))
  }

  const setActualSize = () => {
    setZoomMode('custom')
    setScale(1.0)
    setPageWidth(calculatePageWidth())
  }

  // Intersection Observer to track visible page and load nearby pages
  useEffect(() => {
    if (!numPages) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Don't update during initial load or programmatic scrolling
        if (isScrollingToPage.current || isInitialLoad.current) return

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute('data-page-number') || '1', 10)

            // Load pages in buffer range around ANY visible page
            const buffer = 3
            setVisiblePages(prev => {
              const newPages = new Set(prev)
              for (let i = Math.max(1, pageNum - buffer); i <= Math.min(numPages, pageNum + buffer); i++) {
                newPages.add(i)
              }
              return newPages
            })

            // Update current page if this is the main visible page
            if (entry.intersectionRatio > 0.5 && pageNum !== currentPage) {
              setCurrentPage(pageNum)
              // Update URL without scrolling
              router.replace(`/${pdfName}/${pageNum}`, { scroll: false })
            }
          }
        })
      },
      {
        root: null,
        rootMargin: '100px 0px 100px 0px', // Load pages before they're visible
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    )

    // Observe all page elements
    Object.values(pageRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [numPages, currentPage, router, pdfName])

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
            className="flex flex-col items-center gap-4"
          >
            {numPages && Array.from(new Array(numPages), (_, index) => {
              const pageNum = index + 1
              const shouldRender = visiblePages.has(pageNum)

              return (
                <div
                  key={`page_${pageNum}`}
                  ref={(el) => {
                    pageRefs.current[pageNum] = el
                  }}
                  data-page-number={pageNum}
                  className="shadow-lg"
                  style={{
                    minHeight: shouldRender ? 'auto' : `${pageHeight * scale}px`,
                  }}
                >
                  {shouldRender ? (
                    <Page
                      pageNumber={pageNum}
                      width={pageWidth}
                      scale={scale}
                      loading={
                        <div className="flex items-center justify-center bg-gray-100" style={{ width: pageWidth * scale, height: pageHeight * scale }}>
                          <div className="text-gray-600">Loading page {pageNum}...</div>
                        </div>
                      }
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      onLoadSuccess={(page) => {
                        // Update actual page height
                        const actualHeight = page.height * (pageWidth / page.width)
                        setPageHeight(actualHeight)
                      }}
                    />
                  ) : (
                    <div
                      className="flex items-center justify-center bg-gray-50 border border-gray-200"
                      style={{ width: pageWidth * scale, height: pageHeight * scale }}
                    >
                      <div className="text-gray-400 text-sm">Page {pageNum}</div>
                    </div>
                  )}
                </div>
              )
            })}
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
