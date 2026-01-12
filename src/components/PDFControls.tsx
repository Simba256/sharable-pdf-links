'use client'

import { useState } from 'react'

interface PDFControlsProps {
  currentPage: number
  totalPages: number | null
  onPreviousPage: () => void
  onNextPage: () => void
  onGoToPage: (page: number) => void
  canGoPrevious: boolean
  canGoNext: boolean
}

export default function PDFControls({
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
  onGoToPage,
  canGoPrevious,
  canGoNext,
}: PDFControlsProps) {
  const [pageInput, setPageInput] = useState('')

  const handleGoToPage = (e: React.FormEvent) => {
    e.preventDefault()
    const page = parseInt(pageInput, 10)
    if (!isNaN(page) && page >= 1 && (!totalPages || page <= totalPages)) {
      onGoToPage(page)
      setPageInput('')
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-10">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Page info */}
          <div className="text-sm text-gray-700 font-medium">
            Page {currentPage} {totalPages && `of ${totalPages}`}
          </div>

          {/* Navigation controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPreviousPage}
              disabled={!canGoPrevious}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
              aria-label="Previous page"
            >
              Previous
            </button>

            <button
              onClick={onNextPage}
              disabled={!canGoNext}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
              aria-label="Next page"
            >
              Next
            </button>
          </div>

          {/* Jump to page */}
          <form onSubmit={handleGoToPage} className="flex items-center gap-2">
            <label htmlFor="page-jump" className="text-sm text-gray-600">
              Go to page:
            </label>
            <input
              id="page-jump"
              type="number"
              min="1"
              max={totalPages || undefined}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              placeholder={currentPage.toString()}
              className="w-20 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              Go
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
