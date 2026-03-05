import { useState, useRef, useCallback, useEffect } from 'react'
import DropZone          from './components/DropZone.jsx'
import PageCard          from './components/PageCard.jsx'
import ActionBar         from './components/ActionBar.jsx'
import PreviewModal      from './components/PreviewModal.jsx'
import { openPdf, renderPage, renderPageHighRes } from './utils/pdfThumbnail.js'

// ── Constants ──────────────────────────────────────────────────────────────────
const FILE_COLORS = [
  '#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#f97316', '#a855f7'
]

const trunc   = (s, n = 22) => s.length <= n ? s : s.slice(0, n - 1) + '…'
const fmtSize = b => b < 1024 ? `${b}B` : b < 1048576 ? `${(b / 1024).toFixed(1)}KB` : `${(b / 1048576).toFixed(2)}MB`
const isPdf   = f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')

function readBuffer(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result)
    r.onerror = rej
    r.readAsArrayBuffer(file)
  })
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function App() {
  const [sourceFiles,   setSourceFiles]   = useState([])
  const [pageList,      setPageList]      = useState([])
  const [status,        setStatus]        = useState(null)   // { type, msg } | null
  const [isMerging,     setIsMerging]     = useState(false)
  const [preview,       setPreview]       = useState(null)   // { page, src } | null
  const [multiDragMode,    setMultiDragMode]    = useState(false)
  const [hoverPreview,     setHoverPreview]     = useState(true)
  const [chipsOpen,        setChipsOpen]        = useState(true)

  const idCtr           = useRef(0)
  const colorCtr        = useRef(0)
  const dragSrcId       = useRef(null)
  const addMoreRef      = useRef(null)
  const pdfDocsRef       = useRef(new Map())    // fileId → pdfjs document
  const multiDragModeRef  = useRef(false)
  const hoverPreviewRef   = useRef(true)
  const pageListRef      = useRef([])
  const isDraggingRef    = useRef(false)
  const addFilesRef      = useRef(null)          // always-current addFiles reference
  const gridRef          = useRef(null)           // page-grid DOM node

  // Keep refs in sync with state
  useEffect(() => { pageListRef.current = pageList }, [pageList])

  // Close preview with Escape key
  useEffect(() => {
    if (!preview) return
    function onKeyDown(e) { if (e.key === 'Escape') setPreview(null) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [preview])

  const showStatus  = (type, msg) => setStatus({ type, msg })
  const clearStatus = () => setStatus(null)

  // ── Auto-scroll during drag ──────────────────────────────────────────────────
  useEffect(() => {
    const ZONE      = 110   // px from viewport edge to start scrolling
    const MAX_SPEED = 15    // max px per frame
    let isDragging = false
    let curY = 0
    let rafId = null

    function loop() {
      if (!isDragging) return
      const vh = window.innerHeight
      let speed = 0
      if (curY < ZONE) {
        speed = -MAX_SPEED * Math.pow(1 - curY / ZONE, 2)
      } else if (curY > vh - ZONE) {
        speed = MAX_SPEED * Math.pow(1 - (vh - curY) / ZONE, 2)
      }
      if (speed !== 0) window.scrollBy(0, speed)
      rafId = requestAnimationFrame(loop)
    }

    function onDragStart() {
      isDragging = true
      isDraggingRef.current = true
      rafId = requestAnimationFrame(loop)
    }
    function onDragOver(e) { curY = e.clientY }
    function stopScroll() {
      isDragging = false
      isDraggingRef.current = false
      cancelAnimationFrame(rafId)
    }

    document.addEventListener('dragstart', onDragStart)
    document.addEventListener('dragover',  onDragOver)
    document.addEventListener('dragend',   stopScroll)
    document.addEventListener('drop',      stopScroll)

    return () => {
      document.removeEventListener('dragstart', onDragStart)
      document.removeEventListener('dragover',  onDragOver)
      document.removeEventListener('dragend',   stopScroll)
      document.removeEventListener('drop',      stopScroll)
      cancelAnimationFrame(rafId)
    }
  }, [])

  // ── Add files ────────────────────────────────────────────────────────────────
  const addFiles = useCallback(async (files, insertBeforeId = null) => {
    const pdfs = [...files].filter(isPdf)

    for (const file of pdfs) {
      let buffer
      try {
        buffer = await readBuffer(file)
      } catch {
        showStatus('error', `Failed to read "${file.name}".`)
        continue
      }

      const color   = FILE_COLORS[colorCtr.current++ % FILE_COLORS.length]
      const srcFile = {
        id: ++idCtr.current,
        name: file.name,
        size: file.size,
        buffer,
        color,
        pageCount: 0
      }

      setSourceFiles(prev => [...prev, srcFile])
      await loadPages(srcFile, insertBeforeId)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Always keep addFilesRef pointing to the latest addFiles (lets onDrop call it without being in its dep array)
  addFilesRef.current = addFiles

  // ── Load PDF pages (add skeletons immediately, then render thumbnails) ───────
  async function loadPages(srcFile, insertBeforeId = null) {
    let pdfDoc, numPages
    try {
      ;({ pdfDoc, numPages } = await openPdf(srcFile.buffer))
    } catch (err) {
      showStatus('error',
        err.name === 'PasswordException'
          ? `"${srcFile.name}" is password-protected. Remove the password first.`
          : `Cannot open "${srcFile.name}": ${err.message}`
      )
      setSourceFiles(prev => prev.filter(f => f.id !== srcFile.id))
      return
    }

    // Store pdfDoc for high-res preview rendering
    pdfDocsRef.current.set(srcFile.id, pdfDoc)

    // Update page count on source file entry
    setSourceFiles(prev =>
      prev.map(f => f.id === srcFile.id ? { ...f, pageCount: numPages } : f)
    )

    // Create skeleton page entries (all selected by default)
    const newPages = Array.from({ length: numPages }, (_, i) => ({
      id:           ++idCtr.current,
      fileId:       srcFile.id,
      fileName:     srcFile.name,
      fileColor:    srcFile.color,
      pageIndex:    i,
      selected:     true,
      thumbnailUrl: null
    }))

    setPageList(prev => {
      if (insertBeforeId !== null) {
        const idx = prev.findIndex(p => p.id === insertBeforeId)
        if (idx !== -1) return [...prev.slice(0, idx), ...newPages, ...prev.slice(idx)]
      }
      return [...prev, ...newPages]
    })
    clearStatus()

    // Render thumbnails progressively in the background (no await)
    renderAllThumbs(pdfDoc, newPages)
  }

  async function renderAllThumbs(pdfDoc, pages) {
    for (const page of pages) {
      try {
        const url = await renderPage(pdfDoc, page.pageIndex)
        // Functional update: only the matching page entry changes
        setPageList(prev =>
          prev.map(p => p.id === page.id ? { ...p, thumbnailUrl: url } : p)
        )
      } catch { /* silently skip failed page renders */ }
    }
  }

  // ── Hover preview ────────────────────────────────────────────────────────────
  const handleHoverPreview = useCallback(async (page) => {
    setPreview({ page, src: null })   // show modal immediately with spinner
    const pdfDoc = pdfDocsRef.current.get(page.fileId)
    if (!pdfDoc) { setPreview(null); return }
    try {
      const src = await renderPageHighRes(pdfDoc, page.pageIndex)
      setPreview({ page, src })
    } catch {
      setPreview(null)
    }
  }, [])

  // ── Selection helpers ─────────────────────────────────────────────────────────
  const togglePage = useCallback(id => {
    setPageList(prev => prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p))
  }, [])

  const selectAll    = useCallback(() => setPageList(prev => prev.map(p => ({ ...p, selected: true }))),  [])
  const deselectAll  = useCallback(() => setPageList(prev => prev.map(p => ({ ...p, selected: false }))), [])
  const selectFile   = useCallback(fid => setPageList(prev => prev.map(p => p.fileId === fid ? { ...p, selected: true }  : p)), [])
  const deselectFile = useCallback(fid => setPageList(prev => prev.map(p => p.fileId === fid ? { ...p, selected: false } : p)), [])

  const removeFile = useCallback(fid => {
    pdfDocsRef.current.delete(fid)
    setPreview(prev => prev?.page?.fileId === fid ? null : prev)
    setPageList(prev => prev.filter(p => p.fileId !== fid))
    setSourceFiles(prev => prev.filter(f => f.id !== fid))
    clearStatus()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Multi-drag mode toggle ────────────────────────────────────────────────────
  function toggleMultiDragMode() {
    const next = !multiDragMode
    setMultiDragMode(next)
    multiDragModeRef.current = next
  }

  // ── Hover preview toggle ──────────────────────────────────────────────────────
  function toggleHoverPreview() {
    const next = !hoverPreview
    setHoverPreview(next)
    hoverPreviewRef.current = next
  }

  // ── Drag-to-reorder ────────────────────────────────────────────────────────────
  function clearDragMarks() {
    document.querySelectorAll('.drag-before,.drag-after')
      .forEach(el => el.classList.remove('drag-before', 'drag-after'))
  }

  const onDragStart = useCallback((e, pageId) => {
    isDraggingRef.current = true
    setPreview(null)                            // dismiss any open preview immediately
    dragSrcId.current = pageId
    e.currentTarget.classList.add('dragging')
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(pageId))

    // Multi-drag: show ghost image with count of selected pages
    if (multiDragModeRef.current) {
      const dragged = pageListRef.current.find(p => p.id === pageId)
      if (dragged?.selected) {
        const count = pageListRef.current.filter(p => p.selected).length
        if (count > 1) {
          const ghost = document.createElement('div')
          ghost.className = 'drag-ghost'
          ghost.textContent = `Moving ${count} pages`
          document.body.appendChild(ghost)
          e.dataTransfer.setDragImage(ghost, 65, 20)
          setTimeout(() => { if (ghost.parentNode) ghost.parentNode.removeChild(ghost) }, 0)
        }
      }
    }
  }, [])

  const onDragOver = useCallback((e, pageId) => {
    e.preventDefault()
    // Don't set dropEffect here — let onGridDragOver (which always runs after
    // this, via bubbling) handle it. Setting it here risks conflicting with
    // the OS effectAllowed and permanently locking in the ⊘ cursor.
    if (dragSrcId.current && pageId === dragSrcId.current) return   // hovering source card
    clearDragMarks()
    const { left, width } = e.currentTarget.getBoundingClientRect()
    e.currentTarget.classList.add(e.clientX < left + width / 2 ? 'drag-before' : 'drag-after')
  }, [])

  const onDragLeave = useCallback(e => {
    if (!e.currentTarget.contains(e.relatedTarget))
      e.currentTarget.classList.remove('drag-before', 'drag-after')
  }, [])

  const onDrop = useCallback((e, targetId) => {
    e.preventDefault()

    // ── External file drop (OS → browser) ──────────────────────────────────
    if (!dragSrcId.current) {
      const files = [...e.dataTransfer.files].filter(isPdf)
      if (files.length) {
        const isBefore = e.currentTarget.classList.contains('drag-before')
        clearDragMarks()
        // Resolve the precise insertion point
        let insertBeforeId = null
        if (isBefore) {
          insertBeforeId = targetId                    // insert before this card
        } else {
          const list = pageListRef.current
          const idx  = list.findIndex(p => p.id === targetId)
          if (idx !== -1 && idx + 1 < list.length) insertBeforeId = list[idx + 1].id
          // else null → append at end (target was the last card)
        }
        addFilesRef.current(files, insertBeforeId)
      } else {
        clearDragMarks()
      }
      return
    }

    // ── Internal card reorder ───────────────────────────────────────────────
    const srcId    = dragSrcId.current
    const isBefore = e.currentTarget.classList.contains('drag-before')
    clearDragMarks()
    if (srcId === targetId) return

    setPageList(prev => {
      // Multi-drag: batch move all selected pages together
      if (multiDragModeRef.current) {
        const draggedPage = prev.find(p => p.id === srcId)
        if (draggedPage?.selected) {
          const selected = prev.filter(p => p.selected)
          const rest     = prev.filter(p => !p.selected)
          let insertIdx  = rest.findIndex(p => p.id === targetId)
          if (insertIdx === -1) insertIdx = rest.length   // target was selected → place at end
          else if (!isBefore) insertIdx++
          const result = [...rest]
          result.splice(insertIdx, 0, ...selected)
          return result
        }
      }

      // Single-drag (default)
      const list   = [...prev]
      const srcIdx = list.findIndex(p => p.id === srcId)
      const [item] = list.splice(srcIdx, 1)
      let tgtIdx   = list.findIndex(p => p.id === targetId)
      if (tgtIdx === -1) return prev
      if (!isBefore) tgtIdx++
      list.splice(tgtIdx, 0, item)
      return list
    })
    dragSrcId.current = null
  }, [])

  const onDragEnd = useCallback(e => {
    isDraggingRef.current = false
    e.currentTarget.classList.remove('dragging')
    clearDragMarks()
    dragSrcId.current = null
  }, [])

  // ── Grid-level handlers: allow drops in gap space between cards ──────────────
  const onGridDragOver = useCallback((e) => {
    // ALWAYS call preventDefault — this lets drops land in the gaps between cards.
    // Without this, the browser shows "no drop" cursor in the 12px gap space,
    // making it feel like dragging is completely blocked.
    e.preventDefault()
    if (e.dataTransfer.types.includes('Files')) {
      // External OS file drag — show copy cursor + grid highlight
      e.dataTransfer.dropEffect = 'copy'
      if (gridRef.current) gridRef.current.classList.add('ext-drag-over')
    } else {
      // Internal card drag — show move cursor, no highlight
      e.dataTransfer.dropEffect = 'move'
    }
  }, [])

  const onGridDragLeave = useCallback((e) => {
    if (!e.currentTarget.contains(e.relatedTarget))
      if (gridRef.current) gridRef.current.classList.remove('ext-drag-over')
  }, [])

  const onGridDrop = useCallback((e) => {
    if (gridRef.current) gridRef.current.classList.remove('ext-drag-over')
    e.preventDefault()

    if (dragSrcId.current) {
      // Internal card dropped in empty grid space (gap/end) → move to end of list
      const srcId = dragSrcId.current
      clearDragMarks()
      setPageList(prev => {
        if (multiDragModeRef.current) {
          // Multi-drag: move all selected pages to end
          const dragged = prev.find(p => p.id === srcId)
          if (dragged?.selected) {
            const selected = prev.filter(p => p.selected)
            const rest     = prev.filter(p => !p.selected)
            return [...rest, ...selected]
          }
        }
        // Single card → move to end
        const list   = [...prev]
        const srcIdx = list.findIndex(p => p.id === srcId)
        if (srcIdx === -1) return prev
        const [item] = list.splice(srcIdx, 1)
        return [...list, item]
      })
      dragSrcId.current = null
      return
    }

    // External file drop in empty grid space → append at end
    if (!e.dataTransfer.files.length) return
    const files = [...e.dataTransfer.files].filter(isPdf)
    if (files.length) addFilesRef.current(files, null)
  }, [])

  // ── Merge → POST to Express ──────────────────────────────────────────────────
  async function handleMerge(filename) {
    const selected = pageList.filter(p => p.selected)
    if (!selected.length) return

    setIsMerging(true)
    clearStatus()

    try {
      // Map fileId → index in the files array sent to server
      const neededIds = [...new Set(selected.map(p => p.fileId))]
      const idToIdx   = Object.fromEntries(neededIds.map((id, i) => [id, i]))

      const form = new FormData()
      neededIds.forEach(fid => {
        const src  = sourceFiles.find(f => f.id === fid)
        form.append('files', new Blob([src.buffer], { type: 'application/pdf' }), src.name)
      })
      form.append('selection', JSON.stringify(
        selected.map(p => ({ fileIndex: idToIdx[p.fileId], pageIndex: p.pageIndex }))
      ))
      form.append('filename', filename)

      const res = await fetch('/api/merge', { method: 'POST', body: form })
      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'Server error' }))
        throw new Error(json.error || 'Merge failed')
      }

      // Download the returned PDF
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 12000)

      showStatus('success', `✓ ${selected.length} pages merged — check your Downloads folder.`)
    } catch (err) {
      showStatus('error', `Error: ${err.message}`)
    } finally {
      setIsMerging(false)
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────────
  const selectedCount = pageList.filter(p => p.selected).length
  const hasFiles      = sourceFiles.length > 0

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <header className="header">
        <h1 className="h-title">✦ PDF Merger</h1>
        <p className="h-sub">Load PDFs · pick individual pages · drag to reorder · export your custom merge</p>
      </header>

      <DropZone onFiles={addFiles} compact={hasFiles} />

      {hasFiles && (
        <main className="main-content">

          {/* ── Toolbar (sticky) ── */}
          <div className="toolbar" role="toolbar" aria-label="Page selection and drag tools">
            <button className="tbtn accent" onClick={selectAll} aria-label="Select all pages">Select All</button>
            <button className="tbtn" onClick={deselectAll} aria-label="Deselect all pages">Deselect All</button>
            <button className="tbtn" onClick={() => addMoreRef.current?.click()} aria-label="Add more PDF files">+ Add More PDFs</button>
            <input
              ref={addMoreRef}
              type="file" multiple accept=".pdf" hidden
              aria-hidden="true" tabIndex={-1}
              onChange={e => { addFiles([...e.target.files]); e.target.value = '' }}
            />
            <button
              className={`tbtn${multiDragMode ? ' active' : ''}`}
              onClick={toggleMultiDragMode}
              aria-pressed={multiDragMode}
              aria-label={`Multi-drag mode ${multiDragMode ? 'on' : 'off'}. When on, dragging any selected page moves all selected pages as a group.`}
            >
              ⊕ Multi-Drag {multiDragMode ? 'ON' : 'OFF'}
            </button>
            <button
              className={`tbtn${hoverPreview ? ' active' : ''}`}
              onClick={toggleHoverPreview}
              aria-pressed={hoverPreview}
              aria-label={`Hover preview ${hoverPreview ? 'on' : 'off'}. When on, hovering over a page for 1.5 seconds shows a full-size preview.`}
            >
              ◉ Preview {hoverPreview ? 'ON' : 'OFF'}
            </button>
            <span className="sel-count" aria-live="polite" aria-atomic="true">
              {selectedCount} / {pageList.length} pages selected
            </span>
          </div>

          {/* ── Source file list (collapsible) ── */}
          <div className="chips-section">
            <button
              className="chips-toggle-btn"
              onClick={() => setChipsOpen(o => !o)}
              aria-expanded={chipsOpen}
              aria-controls="chips-list"
              aria-label={`${chipsOpen ? 'Collapse' : 'Expand'} loaded files list`}
            >
              <span className="chips-toggle-icon" aria-hidden="true">{chipsOpen ? '▾' : '▸'}</span>
              Loaded files
              <span className="chips-count">{sourceFiles.length}</span>
            </button>

            {chipsOpen && (
              <div className="chips-bar" id="chips-list">
                {sourceFiles.map(sf => (
                  <div key={sf.id} className="chip" role="group" aria-label={sf.name}>
                    <span className="chip-dot" style={{ background: sf.color }} aria-hidden="true" />
                    <span className="chip-name" title={sf.name}>{trunc(sf.name, 28)}</span>
                    <span className="chip-ct" aria-label={`${sf.pageCount} pages, ${fmtSize(sf.size)}`}>
                      {sf.pageCount}p · {fmtSize(sf.size)}
                    </span>
                    <span className="chip-sep" aria-hidden="true" />
                    <button className="chip-btn" onClick={() => selectFile(sf.id)}   aria-label={`Select all pages from ${sf.name}`}>All</button>
                    <button className="chip-btn" onClick={() => deselectFile(sf.id)} aria-label={`Deselect all pages from ${sf.name}`}>None</button>
                    <button className="chip-btn rem" onClick={() => removeFile(sf.id)} aria-label={`Delete ${sf.name}`}>🗑 Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Page grid ── */}
          <div
            ref={gridRef}
            className="page-grid"
            role="list"
            aria-label="PDF pages"
            onDragOver={onGridDragOver}
            onDragLeave={onGridDragLeave}
            onDrop={onGridDrop}
          >
            {pageList.map(page => (
              <PageCard
                key={page.id}
                page={page}
                onToggle={togglePage}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onDragEnd={onDragEnd}
                onHoverPreview={handleHoverPreview}
                multiDragMode={multiDragMode}
                isDraggingRef={isDraggingRef}
                hoverPreviewRef={hoverPreviewRef}
              />
            ))}
          </div>

          <p className="privacy">
            🔒 Thumbnails render locally in your browser. Only selected pages are uploaded to the local server for merging.
          </p>
        </main>
      )}

      <ActionBar
        visible={hasFiles}
        selectedCount={selectedCount}
        isMerging={isMerging}
        status={status}
        onMerge={handleMerge}
      />

      {preview && (
        <PreviewModal
          src={preview.src}
          pageNum={preview.page.pageIndex + 1}
          fileName={preview.page.fileName}
          onClose={() => setPreview(null)}
        />
      )}

    </div>
  )
}
