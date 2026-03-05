const express = require('express')
const multer  = require('multer')
const path    = require('path')
const { PDFDocument } = require('pdf-lib')

const app  = express()
const PORT = 3001

// ── File upload (memory, 200 MB per file) ────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 200 * 1024 * 1024 }
})

// ── Serve built React app in production ──────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')))

// ── POST /api/merge ──────────────────────────────────────────────────────────
// Accepts multipart/form-data:
//   files     – PDF buffers (uploaded in fileIndex order)
//   selection – JSON: [{ fileIndex, pageIndex }, …]  (selected pages in display order)
//   filename  – desired output filename (without extension)
app.post('/api/merge', upload.array('files'), async (req, res) => {
  try {
    const selection = JSON.parse(req.body.selection || '[]')
    const rawName   = (req.body.filename || 'merged').replace(/\.pdf$/i, '')
    const filename  = `${rawName}.pdf`

    if (!selection.length)             return res.status(400).json({ error: 'No pages selected.' })
    if (!req.files || !req.files.length) return res.status(400).json({ error: 'No files uploaded.' })

    const mergedDoc = await PDFDocument.create()
    const cache     = new Map()   // fileIndex → PDFDocument

    for (const { fileIndex, pageIndex } of selection) {
      if (fileIndex < 0 || fileIndex >= req.files.length) continue

      if (!cache.has(fileIndex)) {
        try {
          const srcDoc = await PDFDocument.load(req.files[fileIndex].buffer)
          cache.set(fileIndex, srcDoc)
        } catch (err) {
          return res.status(422).json({ error: `File ${fileIndex} could not be read: ${err.message}` })
        }
      }

      const srcDoc  = cache.get(fileIndex)
      const indices = srcDoc.getPageIndices()
      if (pageIndex < 0 || pageIndex >= indices.length) continue

      const [copied] = await mergedDoc.copyPages(srcDoc, [pageIndex])
      mergedDoc.addPage(copied)
    }

    if (mergedDoc.getPageCount() === 0) {
      return res.status(400).json({ error: 'No valid pages to merge.' })
    }

    const bytes = await mergedDoc.save()
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', bytes.byteLength)
    res.send(Buffer.from(bytes))

  } catch (err) {
    console.error('[/api/merge]', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// ── Fallback: serve React SPA (production only) ──────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`\n🚀  Express server  →  http://localhost:${PORT}`)
  console.log(`    POST /api/merge  ready\n`)
})
