// PDF configuration - add new PDFs here
export const PDF_CONFIG: Record<string, { file: string; title: string }> = {
  prospectus: {
    file: '/UG_Prospectus_2021.pdf',
    title: 'University Prospectus',
  },
  // Add more PDFs here in the future:
  // resume: {
  //   file: '/resume.pdf',
  //   title: 'Resume',
  // },
}

export function getPdfConfig(pdfName: string) {
  return PDF_CONFIG[pdfName] || null
}

export function isValidPdfName(pdfName: string): boolean {
  return pdfName in PDF_CONFIG
}
