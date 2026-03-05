import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Loader2, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'
import DropZone from './components/DropZone'
import PDFViewer from './components/PDFViewer'
import Toolbar from './components/Toolbar'
import SidePanel from './components/SidePanel'
import EditModal from './components/EditModal'
import { loadPDF, exportPDF } from './utils/pdfRenderer'
import { runOCR } from './utils/ocrEngine'

// ── Toast helpers ─────────────────────────────────────────────────────────────
const TOAST_ICONS = {
  success:  <CheckCircle2  size={14} className="flex-shrink-0 text-emerald-300" />,
  scanning: <Loader2       size={14} className="flex-shrink-0 text-blue-300 animate-spin" />,
  info:     <Info          size={14} className="flex-shrink-0 text-gray-300" />,
  warning:  <AlertTriangle size={14} className="flex-shrink-0 text-amber-300" />,
  error:    <XCircle       size={14} className="flex-shrink-0 text-red-300" />,
}
const TOAST_CLASSES = {
  success:  'bg-emerald-950/95 border-emerald-700/50 text-emerald-100',
  scanning: 'bg-blue-950/95   border-blue-700/50   text-blue-100',
  info:     'bg-gray-800/95   border-gray-600/50   text-gray-100',
  warning:  'bg-amber-950/95  border-amber-700/50  text-amber-100',
  error:    'bg-red-950/95    border-red-700/50    text-red-100',
}

export default function App() {
  // ─── Document state ───────────────────────────────────────────────
  const [pdfFile, setPdfFile]         = useState(null)
  const [pdfDocument, setPdfDocument] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages]   = useState(0)

  // ─── Text / font state ────────────────────────────────────────────
  const [textBlocksMap, setTextBlocksMap] = useState({})
  const [detectedFonts, setDetectedFonts] = useState([])

  // ─── Edit state ───────────────────────────────────────────────────
  const [edits, setEdits]         = useState([])
  const [editModal, setEditModal] = useState(null)

  // ─── UI state ─────────────────────────────────────────────────────
  const [mode, setMode]                   = useState('view')
  const [zoom, setZoom]                   = useState(1.0)
  const [sidePanel, setSidePanel]         = useState(null)
  const [isProcessing, setIsProcessing]   = useState(false)
  const [ocrProgress, setOCRProgress]     = useState(0)

  // ─── Toast state ──────────────────────────────────────────────────
  const [statusToast, setStatusToast] = useState(null)
  const toastTimerRef                 = useRef(null)

  const showToast = useCallback((type, text) => {
    clearTimeout(toastTimerRef.current)
    const id = Date.now()
    setStatusToast({ type, text, id })
    // 'scanning' toasts persist until replaced; others auto-dismiss
    if (type !== 'scanning') {
      const delay = type === 'error' ? 6000 : 3500
      toastTimerRef.current = setTimeout(
        () => setStatusToast((prev) => (prev?.id === id ? null : prev)),
        delay,
      )
    }
  }, [])

  // ─── Stable refs (avoid stale-closure issues in effects) ─────────
  const pdfDocumentRef      = useRef(null)
  const isProcessingRef     = useRef(false)
  const autoScannedPagesRef = useRef(new Set())

  useEffect(() => { pdfDocumentRef.current  = pdfDocument  }, [pdfDocument])
  useEffect(() => { isProcessingRef.current = isProcessing }, [isProcessing])

  // ─── Auto-OCR: silently scans pages with no native text ──────────
  const runAutoOCR = useCallback(async (pageNum) => {
    if (!pdfDocumentRef.current) return
    setIsProcessing(true)
    setOCRProgress(0)
    showToast('scanning', 'No native text — scanning document…')
    try {
      const blocks = await runOCR(
        pdfDocumentRef.current,
        pageNum,
        setOCRProgress,
        false, // not handwriting mode
      )
      setTextBlocksMap((prev) => ({
        ...prev,
        [pageNum]: [...(prev[pageNum] || []), ...blocks],
      }))
      if (blocks.length > 0) {
        showToast(
          'success',
          `${blocks.length} text block${blocks.length === 1 ? '' : 's'} found — click any to edit`,
        )
        setMode('edit')
      } else {
        showToast('info', 'No text found — this page may be image-only')
      }
    } catch {
      showToast('error', 'Auto-scan failed — try OCR Scan mode manually')
    } finally {
      setIsProcessing(false)
      setOCRProgress(0)
    }
  }, [showToast])

  // Watch textBlocksMap: trigger auto-OCR whenever a page comes back empty
  useEffect(() => {
    const blocks = textBlocksMap[currentPage]
    if (
      blocks !== undefined &&
      blocks.length === 0 &&
      !autoScannedPagesRef.current.has(currentPage) &&
      pdfDocumentRef.current &&
      !isProcessingRef.current
    ) {
      autoScannedPagesRef.current.add(currentPage)
      runAutoOCR(currentPage)
    }
  }, [textBlocksMap, currentPage, runAutoOCR])

  // ─── File load ────────────────────────────────────────────────────
  const handleFileLoad = useCallback(async (file) => {
    setIsProcessing(true)
    try {
      const doc = await loadPDF(file)
      autoScannedPagesRef.current = new Set() // reset for new document
      setPdfFile(file)
      setPdfDocument(doc)
      setTotalPages(doc.numPages)
      setCurrentPage(1)
      setEdits([])
      setTextBlocksMap({})
      setDetectedFonts([])
      setMode('edit')
      setSidePanel(null)
    } catch {
      showToast('error', 'Could not load this PDF — it may be password-protected or corrupted')
    } finally {
      setIsProcessing(false)
    }
  }, [showToast])

  // ─── Text extraction callback ─────────────────────────────────────
  const handleTextExtracted = useCallback((pageNum, blocks, fonts) => {
    setTextBlocksMap((prev) => ({ ...prev, [pageNum]: blocks }))
    if (fonts?.length > 0) {
      setDetectedFonts((prev) => [...new Set([...prev, ...fonts])])
    }
    if (blocks.length > 0) {
      showToast(
        'success',
        `${blocks.length} text block${blocks.length === 1 ? '' : 's'} ready — click any to edit`,
      )
    }
    // If blocks.length === 0, the auto-OCR effect will fire
  }, [showToast])

  // ─── Manual OCR (toolbar button) ──────────────────────────────────
  const handleOCR = useCallback(async () => {
    if (!pdfDocument) return
    setIsProcessing(true)
    setOCRProgress(0)
    const isHandwriting = mode === 'handwriting'
    showToast('scanning', isHandwriting ? 'Analysing handwriting…' : 'Running OCR scan…')
    try {
      const blocks = await runOCR(pdfDocument, currentPage, setOCRProgress, isHandwriting)
      setTextBlocksMap((prev) => ({
        ...prev,
        [currentPage]: [...(prev[currentPage] || []), ...blocks],
      }))
      if (blocks.length > 0) {
        showToast('success', `${blocks.length} block${blocks.length === 1 ? '' : 's'} detected`)
      } else {
        showToast('info', 'No text found on this page')
      }
    } catch {
      showToast('error', 'OCR failed — please try again')
    } finally {
      setIsProcessing(false)
      setOCRProgress(0)
    }
  }, [pdfDocument, currentPage, mode, showToast])

  // ─── Edit modal ───────────────────────────────────────────────────
  const handleEditBlock = useCallback((block) => {
    if (mode === 'view') return
    setEditModal(block)
  }, [mode])

  const handleSaveEdit = useCallback((editData) => {
    setEdits((prev) => {
      const idx = prev.findIndex((e) => e.blockId === editData.blockId)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = editData
        return updated
      }
      return [...prev, editData]
    })
    setEditModal(null)
    showToast('success', 'Edit saved')
  }, [showToast])

  // ─── Export ───────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (!pdfFile || edits.length === 0) {
      showToast('info', 'No edits yet — make some text changes first')
      return
    }
    setIsProcessing(true)
    showToast('scanning', 'Building PDF…')
    try {
      await exportPDF(pdfFile, edits, totalPages)
      showToast('success', 'PDF exported successfully')
    } catch (err) {
      showToast('error', `Export failed: ${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }, [pdfFile, edits, totalPages, showToast])

  // ─── No file loaded ───────────────────────────────────────────────
  if (!pdfFile) return <DropZone onFileLoad={handleFileLoad} />

  const currentBlocks = textBlocksMap[currentPage] || []

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      <Toolbar
        mode={mode}
        setMode={setMode}
        zoom={zoom}
        setZoom={setZoom}
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
        onOCR={handleOCR}
        onExport={handleExport}
        isProcessing={isProcessing}
        onNewFile={() => { setPdfFile(null); setPdfDocument(null) }}
        sidePanel={sidePanel}
        setSidePanel={setSidePanel}
        editCount={edits.length}
      />

      <div className="flex flex-1 overflow-hidden">
        <SidePanel
          activePanel={sidePanel}
          detectedFonts={detectedFonts}
          textBlocks={currentBlocks}
          edits={edits}
          mode={mode}
        />

        {/* PDF viewer area */}
        <div className="flex-1 overflow-auto bg-gray-900 relative">

          {/* Thin OCR progress bar (manual + auto) */}
          {isProcessing && ocrProgress > 0 && (
            <div className="absolute top-0 left-0 right-0 z-20">
              <div
                className="bg-blue-500 h-0.5 rounded-r-full transition-all duration-300"
                style={{ width: `${ocrProgress}%` }}
              />
            </div>
          )}

          {pdfDocument ? (
            <PDFViewer
              pdfDocument={pdfDocument}
              currentPage={currentPage}
              zoom={zoom}
              mode={mode}
              textBlocks={currentBlocks}
              edits={edits}
              onTextExtracted={handleTextExtracted}
              onEditBlock={handleEditBlock}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-600">Loading…</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editModal && (
        <EditModal
          block={editModal}
          edits={edits}
          onSave={handleSaveEdit}
          onClose={() => setEditModal(null)}
          mode={mode}
          detectedFonts={detectedFonts}
        />
      )}

      {/* ── Floating toast ────────────────────────────────────────── */}
      {statusToast && (
        <div
          className="fixed bottom-8 left-1/2 z-50 pointer-events-none"
          style={{ transform: 'translateX(-50%)' }}
        >
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border shadow-2xl text-sm font-medium backdrop-blur-sm whitespace-nowrap ${TOAST_CLASSES[statusToast.type]}`}
            style={{ animation: 'toastSlideUp 0.25s ease-out' }}
          >
            {TOAST_ICONS[statusToast.type]}
            {statusToast.text}
          </div>
        </div>
      )}
    </div>
  )
}
