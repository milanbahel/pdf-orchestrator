import * as pdfjs from 'pdfjs-dist'

// Use CDN worker to avoid Vite bundling complexity
pdfjs.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

const SCALE      = 0.35
const SCALE_HIGH = 1.5

/**
 * Open a PDF from an ArrayBuffer.
 * @param {ArrayBuffer} buffer
 * @returns {Promise<{ pdfDoc: object, numPages: number }>}
 */
export async function openPdf(buffer) {
  const pdfDoc = await pdfjs.getDocument({ data: buffer.slice(0) }).promise
  return { pdfDoc, numPages: pdfDoc.numPages }
}

/**
 * Render one page to a JPEG data-URL.
 * @param {object}  pdfDoc     – pdfjs document object
 * @param {number}  pageIndex  – 0-based page index
 * @returns {Promise<string>}  data-URL
 */
export async function renderPage(pdfDoc, pageIndex) {
  const page     = await pdfDoc.getPage(pageIndex + 1)
  const viewport = page.getViewport({ scale: SCALE })
  const canvas   = document.createElement('canvas')
  canvas.width   = Math.floor(viewport.width)
  canvas.height  = Math.floor(viewport.height)
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
  return canvas.toDataURL('image/jpeg', 0.82)
}

/**
 * Render one page at high resolution for the preview popup.
 * @param {object}  pdfDoc     – pdfjs document object
 * @param {number}  pageIndex  – 0-based page index
 * @returns {Promise<string>}  data-URL
 */
export async function renderPageHighRes(pdfDoc, pageIndex) {
  const page     = await pdfDoc.getPage(pageIndex + 1)
  const viewport = page.getViewport({ scale: SCALE_HIGH })
  const canvas   = document.createElement('canvas')
  canvas.width   = Math.floor(viewport.width)
  canvas.height  = Math.floor(viewport.height)
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
  return canvas.toDataURL('image/jpeg', 0.92)
}
