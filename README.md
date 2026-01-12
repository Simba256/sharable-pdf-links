# Shareable PDF Links

A Next.js application for hosting PDFs with shareable links to specific pages.

## Features

- 📄 Continuous scrolling through PDF pages
- 🔗 Shareable links to specific pages
- 🔍 Full-text search functionality
- 🔎 Zoom controls with presets (Fit to Width, Fit to Page, etc.)
- ⚡ Lazy loading for fast performance
- 📱 Mobile responsive
- 🎯 Support for multiple PDFs

## URL Structure

- `/prospectus` or `/prospectus/1` - View prospectus starting at page 1
- `/prospectus/33` - Direct link to page 33 of prospectus
- `/resume/2` - Direct link to page 2 of resume (when added)

## Adding New PDFs

To add a new PDF to the website:

### 1. Add your PDF file to the `public/` directory

```bash
cp your-new-pdf.pdf public/
```

### 2. Update the PDF configuration

Edit `src/config/pdfs.ts` and add your PDF:

```typescript
export const PDF_CONFIG: Record<string, { file: string; title: string }> = {
  prospectus: {
    file: '/UG_Prospectus_2021.pdf',
    title: 'University Prospectus',
  },
  resume: {
    file: '/your-new-pdf.pdf',
    title: 'My Resume',
  },
  // Add more PDFs here
}
```

### 3. Access your PDF

Your new PDF will be available at:
- `https://your-site.vercel.app/resume` (page 1)
- `https://your-site.vercel.app/resume/5` (page 5)

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Deployment

This project is configured for deployment on Vercel:

1. Push your changes to GitHub
2. Vercel will automatically deploy

## Tech Stack

- **Next.js 15** - React framework with App Router
- **React-PDF** - PDF rendering
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety
- **Vercel** - Hosting

## Keyboard Shortcuts

- `←` / `→` - Navigate between pages
- `+` / `-` - Zoom in/out
- `0` - Reset zoom to Auto

## License

Private project
