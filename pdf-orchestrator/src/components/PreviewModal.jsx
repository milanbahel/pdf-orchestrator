import { useRef, useEffect } from 'react'

export default function PreviewModal({ src, pageNum, fileName, onClose }) {
  const closeRef     = useRef(null)
  const leaveTimerRef = useRef(null)

  // Move focus to close button when modal opens; restore on unmount
  useEffect(() => {
    const prev = document.activeElement
    closeRef.current?.focus()
    return () => { prev?.focus() }
  }, [])

  function handleModalMouseLeave() {
    leaveTimerRef.current = setTimeout(onClose, 200)
  }

  function handleModalMouseEnter() {
    clearTimeout(leaveTimerRef.current)
  }

  const titleId = 'preview-dialog-title'

  return (
    // Clicking the dark backdrop closes; Escape is handled in App.jsx
    <div
      className="preview-overlay"
      onClick={onClose}
      aria-hidden="false"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="preview-modal"
        onClick={e => e.stopPropagation()}
        onMouseLeave={handleModalMouseLeave}
        onMouseEnter={handleModalMouseEnter}
      >
        <div className="preview-header">
          <span id={titleId} className="preview-title">
            p.{pageNum} — {fileName}
          </span>
          <button
            ref={closeRef}
            className="preview-close"
            onClick={onClose}
            aria-label="Close preview"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <div className="preview-img-wrap">
          {src
            ? <img src={src} alt={`Full-size preview of page ${pageNum} from ${fileName}`} className="preview-img" />
            : (
              <div className="preview-loading" role="status" aria-label="Loading preview">
                <div className="spin" aria-hidden="true" />
              </div>
            )
          }
        </div>
      </div>
    </div>
  )
}
