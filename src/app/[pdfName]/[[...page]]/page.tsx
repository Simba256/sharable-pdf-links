'use client'

import { Suspense } from 'react'
import PDFViewer from '@/components/PDFViewer'
import { redirect } from 'next/navigation'
import { isValidPdfName } from '@/config/pdfs'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: {
    pdfName: string
    page?: string[]
  }
}

export default function PDFPage({ params }: PageProps) {
  const { pdfName, page } = params
  const pageNumber = page && page[0] ? parseInt(page[0], 10) : 1

  // Validate PDF name
  if (!isValidPdfName(pdfName)) {
    redirect('/')
  }

  return (
    <main className="min-h-screen">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-600">Loading PDF viewer...</div>
        </div>
      }>
        <PDFViewer pdfName={pdfName} initialPage={pageNumber} />
      </Suspense>
    </main>
  )
}
