import { memo, useRef } from 'react'

const trunc = (s, n = 13) => s.length <= n ? s : s.slice(0, n - 1) + '…'

const PageCard = memo(function PageCard({
  page,
  onToggle,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onHoverPreview,
  multiDragMode,
  isDraggingRef,
  hoverPreviewRef
}) {
  const shortName   = trunc(page.fileName.replace(/\.pdf$/i, ''))
  const hoverTimer  = useRef(null)
  const hoverBarRef = useRef(null)

  function startHover() {
    if (isDraggingRef?.current) return
    if (!hoverPreviewRef?.current) return
    if (hoverBarRef.current) hoverBarRef.current.classList.add('filling')
    hoverTimer.current = setTimeout(() => {
      onHoverPreview(page)
    }, 1500)
  }

  function cancelHover() {
    clearTimeout(hoverTimer.current)
    if (hoverBarRef.current) hoverBarRef.current.classList.remove('filling')
  }

  function handleKeyDown(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      onToggle(page.id)
    }
  }

  const isMultiActive = multiDragMode && page.selected
  const ariaLabel = `Page ${page.pageIndex + 1} of ${page.fileName}, ${page.selected ? 'selected' : 'not selected'}${isMultiActive ? ', part of multi-drag group' : ''}`

  return (
    <div
      role="listitem"
      className={`page-card${page.selected ? ' selected' : ''}${isMultiActive ? ' multi-active' : ''}`}
      data-pageid={page.id}
      draggable
      tabIndex={0}
      aria-label={ariaLabel}
      aria-pressed={page.selected}
      onClick={() => onToggle(page.id)}
      onKeyDown={handleKeyDown}
      onDragStart={e => { cancelHover(); onDragStart(e, page.id) }}
      onDragOver={e  => onDragOver(e, page.id)}
      onDragLeave={e => onDragLeave(e)}
      onDrop={e      => onDrop(e, page.id)}
      onDragEnd={e   => onDragEnd(e)}
      onMouseEnter={startHover}
      onMouseLeave={cancelHover}
    >
      {/* Thumbnail area */}
      <div className="p-thumb">
        {!page.thumbnailUrl && (
          <div className="skeleton" role="status" aria-label="Loading thumbnail" />
        )}
        {page.thumbnailUrl && (
          <img src={page.thumbnailUrl} alt={`Thumbnail of page ${page.pageIndex + 1}`} draggable={false} />
        )}
        <div className="p-check" aria-hidden="true">✓</div>
        <div ref={hoverBarRef} className="hover-bar" aria-hidden="true" />
      </div>

      {/* Label */}
      <div className="p-label" aria-hidden="true">
        <span className="p-num">p.{page.pageIndex + 1}</span>
        <span className="p-dot" style={{ background: page.fileColor }} />
        <span className="p-file">{shortName}</span>
        {isMultiActive && <span className="multi-badge">⊕</span>}
      </div>
    </div>
  )
})

export default PageCard
