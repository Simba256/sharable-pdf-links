'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import PDFControls from './PDFControls'
import SearchBar from './SearchBar'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

const PDF_PATH = '/UG_Prospectus_2021.pdf'

export default function PDFViewer() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageWidth, setPageWidth] = useState<number>(800)
  const [scale, setScale] = useState<number>(1.0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [matchCount, setMatchCount] = useState(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]))
  const [pageHeight, setPageHeight] = useState<number>(0)
  const pdfDocumentRef = useRef<any>(null)
  const pageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})
  const isScrollingToPage = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll to specific page
  const scrollToPage = useCallback((pageNum: number) => {
    const pageElement = pageRefs.current[pageNum]
    if (pageElement) {
      isScrollingToPage.current = true
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTimeout(() => {
        isScrollingToPage.current = false
      }, 1000)
    }
  }, [])

  // Navigation functions
  const goToPage = useCallback((pageNum: number) => {
    if (numPages && pageNum >= 1 && pageNum <= numPages) {
      scrollToPage(pageNum)
      // Update URL
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', pageNum.toString())
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }
  }, [numPages, scrollToPage, searchParams, router, pathname])

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

  // Handle window resize for responsive width
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width < 640) {
        setPageWidth(width - 32) // Mobile: full width minus padding
      } else if (width < 1024) {
        setPageWidth(Math.min(600, width - 64)) // Tablet
      } else {
        setPageWidth(Math.min(800, width - 128)) // Desktop
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const onDocumentLoadSuccess = useCallback((pdf: any) => {
    setNumPages(pdf.numPages)
    pdfDocumentRef.current = pdf
    setIsLoading(false)
    setError(null)

    // Calculate approximate page height for placeholders
    const estimatedPageHeight = pageWidth * 1.4 // Typical A4 ratio
    setPageHeight(estimatedPageHeight)

    // Load initial pages
    const initialPage = parseInt(searchParams.get('page') || '1', 10)
    const pagesToLoad = new Set<number>()
    const buffer = 2
    for (let i = Math.max(1, initialPage - buffer); i <= Math.min(pdf.numPages, initialPage + buffer); i++) {
      pagesToLoad.add(i)
    }
    setVisiblePages(pagesToLoad)

    // Scroll to initial page from URL
    if (initialPage > 1 && initialPage <= pdf.numPages) {
      setTimeout(() => {
        scrollToPage(initialPage)
      }, 500)
    }
  }, [searchParams, scrollToPage, pageWidth])

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
    setScale(prev => Math.min(prev + 0.2, 3.0))
  }

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5))
  }

  const resetZoom = () => {
    setScale(1.0)
  }

  // Intersection Observer to track visible page and load nearby pages
  useEffect(() => {
    if (!numPages) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingToPage.current) return

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const pageNum = parseInt(entry.target.getAttribute('data-page-number') || '1', 10)
            if (pageNum !== currentPage) {
              setCurrentPage(pageNum)

              // Update URL without scrolling
              const params = new URLSearchParams(searchParams.toString())
              params.set('page', pageNum.toString())
              router.replace(`${pathname}?${params.toString()}`, { scroll: false })

              // Load pages in buffer range
              const buffer = 2
              const pagesToLoad = new Set<number>()
              for (let i = Math.max(1, pageNum - buffer); i <= Math.min(numPages, pageNum + buffer); i++) {
                pagesToLoad.add(i)
              }
              setVisiblePages(pagesToLoad)
            }
          }
        })
      },
      {
        root: null,
        rootMargin: '-20% 0px -20% 0px',
        threshold: [0, 0.5, 1],
      }
    )

    // Observe all page elements
    Object.values(pageRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [numPages, currentPage, searchParams, router, pathname])

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
          <h1 className="text-xl font-semibold text-gray-900">PDF Viewer</h1>
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
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
        />
      )}
    </div>
  )
}
