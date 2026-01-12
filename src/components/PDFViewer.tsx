'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import { useSearchParams } from 'next/navigation'
import { usePDFNavigation } from '@/hooks/usePDFNavigation'
import PDFControls from './PDFControls'
import SearchBar from './SearchBar'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

const PDF_PATH = '/UG_Prospectus_2021.pdf'

export default function PDFViewer() {
  const searchParams = useSearchParams()
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageWidth, setPageWidth] = useState<number>(800)
  const [scale, setScale] = useState<number>(1.0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [matchCount, setMatchCount] = useState(0)
  const pdfDocumentRef = useRef<any>(null)

  const {
    currentPage,
    nextPage,
    previousPage,
    goToPage,
    canGoNext,
    canGoPrevious,
  } = usePDFNavigation(numPages)

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

  function onDocumentLoadSuccess(pdf: any) {
    setNumPages(pdf.numPages)
    pdfDocumentRef.current = pdf
    setIsLoading(false)
    setError(null)
  }

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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && canGoPrevious) {
        previousPage()
      } else if (e.key === 'ArrowRight' && canGoNext) {
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
  }, [canGoPrevious, canGoNext, previousPage, nextPage])

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
      <div className="flex-1 overflow-auto pb-20 pt-6">
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
            className="flex justify-center"
          >
            <Page
              pageNumber={currentPage}
              width={pageWidth}
              scale={scale}
              loading={
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-600">Loading page {currentPage}...</div>
                </div>
              }
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
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
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          scale={scale}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
        />
      )}
    </div>
  )
}
