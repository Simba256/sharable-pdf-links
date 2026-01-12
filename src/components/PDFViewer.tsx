'use client'

import { useState, useEffect, useCallback } from 'react'
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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [matchCount, setMatchCount] = useState(0)

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

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
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

    if (!query) {
      setMatchCount(0)
      return
    }

    setIsSearching(true)

    // Simulate search - in a real implementation, you'd search through PDF text
    // For now, we'll just show a basic implementation
    setTimeout(() => {
      // This is a placeholder - actual implementation would use PDF.js getTextContent
      const mockMatches = Math.floor(Math.random() * 20)
      setMatchCount(mockMatches)
      setIsSearching(false)
    }, 500)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && canGoPrevious) {
        previousPage()
      } else if (e.key === 'ArrowRight' && canGoNext) {
        nextPage()
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
        />
      )}
    </div>
  )
}
