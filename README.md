# pdf-orchestrator

A smart PDF merger with a page-level thumbnail editor. Load multiple PDFs, see every page as a draggable card, cherry-pick and reorder pages freely across files, then export a single merged PDF.

---

## Features

- **Page-level view** — every page from every loaded PDF rendered as a thumbnail card
- **Drag to reorder** — drag individual cards (or groups) anywhere in the grid; drop into exact positions
- **Multi-drag** — select multiple pages and move them together as a group
- **External drop** — drag PDF files from Explorer directly onto the grid at a precise position
- **Hover preview** — hold over a card to open a full-size preview of that page
- **Select / deselect** — click any card to include/exclude it from the merge; use per-file bulk controls
- **Collapsible file list** — loaded files panel collapses to save space while scrolling
- **Sticky toolbar** — Select All / Deselect All / Add More always visible while scrolling
- **Custom output name** — set the filename before merging
- **Progressive thumbnails** — skeleton placeholders appear instantly while thumbnails render in the background
- **Duplicate files allowed** — load the same PDF multiple times for repeat pages

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5 |
| Backend | Node.js, Express 4 |
| PDF rendering | PDF.js (pdfjs-dist 3.11.174) |
| PDF merging | pdf-lib 1.17.1 |
| Dev tooling | concurrently |

---

## Getting Started

### Prerequisites

- Node.js 18+

### Install

```bash
npm install
```

### Run (development)

```bash
npm run dev
```

This starts both servers concurrently:
- **Vite** dev server → `http://localhost:5173`
- **Express API** → `http://localhost:3001`

### Run (production)

```bash
npm run build
npm start
```

The Express server serves the built React app and handles `/api/merge` on port `3001`.

---

## How It Works

1. **Drop or browse** PDF files onto the upload zone
2. Each page is extracted and shown as a thumbnail card in the grid
3. **Reorder** by dragging cards; **deselect** pages you don't want
4. Set an output filename and click **Merge**
5. The browser downloads the merged PDF containing only the selected pages in the current order

### API

```
POST /api/merge
Content-Type: multipart/form-data

files[]     – PDF file buffers (one per source file)
selection   – JSON array: [{ fileIndex, pageIndex }, ...]
filename    – output filename (without .pdf)
```

Returns the merged PDF as `application/pdf`.

---

## Project Structure

```
pdf-orchestrator/
├── src/
│   ├── App.jsx                  # Main component — state, drag logic, merge
│   ├── App.css                  # Dark glass-morphism styles
│   ├── main.jsx
│   ├── components/
│   │   ├── PageCard.jsx         # Individual page thumbnail card
│   │   ├── DropZone.jsx         # File drop / browse area
│   │   ├── PreviewModal.jsx     # Full-size page hover preview
│   │   └── ActionBar.jsx        # Bottom merge bar
│   └── utils/
│       └── pdfThumbnail.js      # PDF.js thumbnail renderer
├── server.js                    # Express API server
├── vite.config.js
├── package.json
└── pdf-merger.html              # Standalone single-file version (no build needed)
```

---

## Standalone Version

`pdf-merger.html` is a self-contained single-file version that runs directly in the browser with no server or build step — open it with any modern browser.

---

## License

MIT
