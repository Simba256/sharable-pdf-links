'use client'

import { Suspense } from 'react'
import PDFViewer from '@/components/PDFViewer'

export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-600">Loading PDF viewer...</div>
        </div>
      }>
        <PDFViewer />
      </Suspense>
    </main>
  )
}
