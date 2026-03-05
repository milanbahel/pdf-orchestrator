import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

export async function loadPDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
  return doc
}

export async function renderPageToCanvas(pdfDocument, pageNum, scale = 1.5) {
  const page = await pdfDocument.getPage(pageNum)
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)

  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  await page.render({ canvasContext: ctx, viewport }).promise
  return { canvas, viewport, width: canvas.width, height: canvas.height }
}

/**
 * Extract native text from a PDF page.
 * Returns coordinates in PDF user units (points) — scale-independent.
 * Storing in points means we can display at any zoom and export without conversion.
 */
export async function extractTextFromPage(pdfDocument, pageNum, scale = 1.5) {
  const page = await pdfDocument.getPage(pageNum)
  const viewport = page.getViewport({ scale })
  const textContent = await page.getTextContent()

  const blocks = []
  const fontNames = new Set()

  textContent.items.forEach((item, i) => {
    if (!item.str || item.str.trim() === '') return

    // tx[4], tx[5] are in canvas pixels. Divide by scale → PDF user units.
    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform)
    const fontSizePts = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]) / scale
    const heightPts = Math.max(fontSizePts * 1.2, 3)
    const x = tx[4] / scale
    const y = tx[5] / scale - fontSizePts   // top of block (canvas-axis: 0=top, ↓)
    const width = Math.max((item.width * scale) / scale, 2)  // item.width is already user units

    const fontName = item.fontName || 'Unknown'
    fontNames.add(fontName)

    blocks.push({
      id: `native-${pageNum}-${i}`,
      text: item.str,
      x: +x.toFixed(2),
      y: +y.toFixed(2),
      width: +width.toFixed(2),
      height: +heightPts.toFixed(2),
      fontSize: +fontSizePts.toFixed(2),
      fontName,
      isHandwritten: false,
      source: 'native',
      confidence: 100,
      pageNum,
    })
  })

  return { blocks, fonts: [...fontNames] }
}

/**
 * Export edited PDF.
 * Edit coordinates must be in PDF user units (points, canvas-axis y: 0=top ↓).
 */
export async function exportPDF(originalFile, edits) {
  const arrayBuffer = await originalFile.arrayBuffer()
  const pdfDoc = await PDFDocument.load(arrayBuffer)
  const pages = pdfDoc.getPages()

  const helvetica   = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const timesRoman  = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const courier     = await pdfDoc.embedFont(StandardFonts.Courier)

  const fontMap = {
    Helvetica: helvetica,
    HelveticaBold: helveticaBold,
    TimesRoman: timesRoman,
    Courier: courier,
  }

  for (const edit of edits) {
    const { pageIndex, x, y, width, height, newText, fontSize, chosenFont, handwritingCanvas } = edit
    if (pageIndex == null || pageIndex >= pages.length) continue

    const page = pages[pageIndex]
    const { height: pageH } = page.getSize()

    // Convert canvas-axis (y increases downward) → pdf-lib axis (y increases upward)
    const pdfY = pageH - y - height

    // 1. White-out original
    page.drawRectangle({ x: x - 1, y: pdfY - 1, width: width + 3, height: height + 2, color: rgb(1, 1, 1) })

    if (handwritingCanvas) {
      // 2a. Embed handwriting canvas as PNG image
      try {
        const b64 = handwritingCanvas.toDataURL('image/png').split(',')[1]
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
        const img = await pdfDoc.embedPng(bytes)
        page.drawImage(img, { x, y: pdfY, width, height })
      } catch {
        const font = fontMap[chosenFont] || helvetica
        page.drawText(newText, { x, y: pdfY + 2, size: Math.max(4, Math.min(fontSize || 12, height * 0.85)), font, color: rgb(0, 0, 0) })
      }
    } else {
      // 2b. Standard text replacement
      const font = fontMap[chosenFont] || helvetica
      const safeSize = Math.max(4, Math.min(fontSize || 12, height * 0.85))
      page.drawText(newText, { x, y: pdfY + 2, size: safeSize, font, color: rgb(0, 0, 0) })
    }
  }

  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'edited-document.pdf'
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
