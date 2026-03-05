// Lazy-loaded to keep Tesseract.js off the critical startup path
let _tesseractPromise = null
async function getTesseract() {
  if (!_tesseractPromise) {
    _tesseractPromise = import('tesseract.js').then((m) => m.default ?? m)
  }
  return _tesseractPromise
}

async function getWorker(onProgress) {
  const Tesseract = await getTesseract()
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100))
      }
    },
  })
  return worker
}

/**
 * Run OCR on a rendered PDF page.
 * Returns array of text blocks with bounding boxes.
 */
export async function runOCR(pdfDocument, pageNum, onProgress, isHandwriting = false) {
  const page = await pdfDocument.getPage(pageNum)

  // High resolution render for better OCR accuracy
  const scale = 2.5
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  await page.render({ canvasContext: ctx, viewport }).promise

  // Pre-process canvas for better OCR if needed
  if (isHandwriting) {
    enhanceForHandwriting(ctx, canvas.width, canvas.height)
  }

  const imageData = canvas.toDataURL('image/png')

  onProgress?.(5)

  const worker = await getWorker(onProgress)

  try {
    // PSM 3 = Fully automatic page segmentation (best for mixed content)
    // PSM 6 = Assume a single uniform block of text
    const psm = isHandwriting ? '6' : '3'

    await worker.setParameters({
      tessedit_pageseg_mode: psm,
      tessedit_char_whitelist: '', // Allow all chars
      preserve_interword_spaces: '1',
    })

    const result = await worker.recognize(imageData)
    await worker.terminate()

    return convertTesseractResult(result, scale, pageNum, isHandwriting)
  } catch (err) {
    await worker.terminate()
    throw err
  }
}

/**
 * Enhance canvas for handwriting OCR:
 * - Increase contrast
 * - Slight sharpening
 */
function enhanceForHandwriting(ctx, w, h) {
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    // Convert to grayscale
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]

    // Apply contrast enhancement
    const contrast = 1.4
    const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255))
    const enhanced = factor * (gray - 128) + 128

    const clamped = Math.max(0, Math.min(255, enhanced))
    data[i] = clamped
    data[i + 1] = clamped
    data[i + 2] = clamped
  }

  ctx.putImageData(imageData, 0, 0)
}

/**
 * Convert Tesseract result to our block format
 */
function convertTesseractResult(result, scale, pageNum, isHandwriting) {
  const blocks = []
  const scaleFactor = 1 / scale

  if (!result.data.words) return blocks

  result.data.words.forEach((word, i) => {
    if (!word.text || word.text.trim() === '') return
    if (word.confidence < 20) return // Skip very low confidence

    const { bbox } = word
    const x = Math.round(bbox.x0 * scaleFactor)
    const y = Math.round(bbox.y0 * scaleFactor)
    const width = Math.round((bbox.x1 - bbox.x0) * scaleFactor)
    const height = Math.round((bbox.y1 - bbox.y0) * scaleFactor)
    const fontSize = Math.round(height * 0.72)

    blocks.push({
      id: `ocr-${pageNum}-${i}-${Date.now()}`,
      text: word.text,
      x,
      y,
      width: Math.max(width, 10),
      height: Math.max(height, 8),
      fontSize: Math.max(fontSize, 6),
      fontName: 'Unknown (OCR)',
      confidence: Math.round(word.confidence),
      isHandwritten: isHandwriting,
      source: 'ocr',
      pageNum,
    })
  })

  return blocks
}

/**
 * Run OCR on all pages of a document
 */
export async function runFullDocumentOCR(pdfDocument, onProgress, isHandwriting = false) {
  const allBlocks = {}
  const numPages = pdfDocument.numPages

  for (let p = 1; p <= numPages; p++) {
    const pageProgress = (curr) => {
      const overall = ((p - 1) / numPages) * 100 + curr / numPages
      onProgress?.(Math.round(overall))
    }
    allBlocks[p] = await runOCR(pdfDocument, p, pageProgress, isHandwriting)
  }

  return allBlocks
}
