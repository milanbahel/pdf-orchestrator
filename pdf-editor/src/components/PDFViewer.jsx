import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, ScanLine } from 'lucide-react'
import { renderPageToCanvas, extractTextFromPage } from '../utils/pdfRenderer'
import { normalizeFontName } from '../utils/fontMatcher'
import TextOverlay from './TextOverlay'

/**
 * Renders a single PDF page and the interactive text overlay.
 *
 * Block coordinates (textBlocks) are in PDF user units (points).
 * TextOverlay multiplies by renderScale to position CSS elements.
 *
 * textBlocks come from the PARENT (App.jsx) — single source of truth.
 */
export default function PDFViewer({
  pdfDocument,
  currentPage,
  zoom,
  mode,
  textBlocks,        // PDF-unit blocks from parent (native + OCR)
  edits,
  onTextExtracted,   // (pageNum, blocks, fontNames) → parent stores them
  onEditBlock,
}) {
  const [rendering, setRendering] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const canvasRef         = useRef(null)
  const renderedCanvasRef = useRef(null)
  const [pageKey, setPageKey]   = useState(0)
  const prevPageRef             = useRef(currentPage)

  const renderScale = zoom * 1.5

  const renderPage = useCallback(async () => {
    if (!pdfDocument || !canvasRef.current) return
    setRendering(true)
    try {
      const { canvas } = await renderPageToCanvas(pdfDocument, currentPage, renderScale)

      const visCanvas = canvasRef.current
      visCanvas.width  = canvas.width
      visCanvas.height = canvas.height
      visCanvas.getContext('2d').drawImage(canvas, 0, 0)

      renderedCanvasRef.current = canvas
      setCanvasSize({ width: canvas.width, height: canvas.height })

      const { blocks, fonts } = await extractTextFromPage(pdfDocument, currentPage, renderScale)
      onTextExtracted(currentPage, blocks, fonts.map(normalizeFontName))
    } catch (err) {
      console.error('Render error:', err)
    } finally {
      setRendering(false)
    }
  }, [pdfDocument, currentPage, renderScale, onTextExtracted])

  useEffect(() => {
    // Trigger page-transition fade on page change
    if (prevPageRef.current !== currentPage) {
      prevPageRef.current = currentPage
      setPageKey((k) => k + 1)
    }
    renderPage()
  }, [renderPage, currentPage])

  const hasBlocks = textBlocks.length > 0

  return (
    <div className="flex justify-center py-8 px-4">
      {/*
        key={pageKey} remounts this wrapper on every page change so
        pageFadeIn re-triggers — smooth cross-page transition.
      */}
      <div
        key={pageKey}
        className="relative shadow-2xl bg-white"
        style={{
          width:      canvasSize.width  || 'auto',
          minHeight:  canvasSize.height || 200,
          opacity:    rendering ? 0.35 : 1,
          transition: 'opacity 0.25s ease',
          animation:  'pageFadeIn 0.3s ease-out',
        }}
      >
        {/* PDF canvas */}
        <canvas
          ref={canvasRef}
          className="block"
          style={{ width: canvasSize.width || 'auto', height: canvasSize.height || 'auto' }}
        />

        {/* Compact corner spinner (replaces old full dark overlay) */}
        {rendering && (
          <div className="absolute top-3 right-3 z-10">
            <div className="bg-gray-900/90 border border-gray-700/80 rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-lg">
              <Loader2 size={11} className="animate-spin text-blue-400" />
              <span className="text-gray-300 text-xs">Rendering</span>
            </div>
          </div>
        )}

        {/* Text overlay */}
        {!rendering && canvasSize.width > 0 && (
          <TextOverlay
            blocks={textBlocks}
            edits={edits}
            mode={mode}
            renderScale={renderScale}
            onEditBlock={(block) =>
              onEditBlock({ ...block, pageCanvas: renderedCanvasRef.current })
            }
          />
        )}

        {/* "No text" badge — delayed 1.2 s so it doesn't flash during auto-OCR */}
        {!rendering && canvasSize.width > 0 && !hasBlocks && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
            <div
              className="bg-gray-900/80 border border-gray-700/60 text-gray-400 text-xs rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-lg"
              style={{ animation: 'fadeIn 0.3s ease-out 1.2s both' }}
            >
              <ScanLine size={12} />
              No text detected on this page
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
