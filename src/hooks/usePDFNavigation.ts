'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export function usePDFNavigation(totalPages: number | null) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Get initial page from URL parameter, default to 1
  const initialPage = parseInt(searchParams.get('page') || '1', 10)
  const [currentPage, setCurrentPage] = useState(Math.max(1, initialPage))

  // Update page and URL
  const updatePage = (newPage: number) => {
    if (totalPages && (newPage < 1 || newPage > totalPages)) {
      return // Don't navigate to invalid pages
    }

    setCurrentPage(newPage)

    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // Navigate to next page
  const nextPage = () => {
    if (totalPages && currentPage < totalPages) {
      updatePage(currentPage + 1)
    }
  }

  // Navigate to previous page
  const previousPage = () => {
    if (currentPage > 1) {
      updatePage(currentPage - 1)
    }
  }

  // Jump to specific page
  const goToPage = (page: number) => {
    const pageNum = Math.max(1, page)
    if (totalPages) {
      updatePage(Math.min(pageNum, totalPages))
    } else {
      updatePage(pageNum)
    }
  }

  // Sync with URL changes (browser back/forward)
  useEffect(() => {
    const pageFromUrl = parseInt(searchParams.get('page') || '1', 10)
    if (pageFromUrl !== currentPage) {
      setCurrentPage(pageFromUrl)
    }
  }, [searchParams])

  // Validate current page when totalPages is loaded
  useEffect(() => {
    if (totalPages && currentPage > totalPages) {
      updatePage(totalPages)
    }
  }, [totalPages])

  return {
    currentPage,
    nextPage,
    previousPage,
    goToPage,
    canGoNext: totalPages ? currentPage < totalPages : true,
    canGoPrevious: currentPage > 1,
  }
}
