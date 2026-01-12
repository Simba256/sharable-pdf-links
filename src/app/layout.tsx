import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PDF Viewer',
  description: 'View and share PDF documents with direct links to specific pages',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  )
}
