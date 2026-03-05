const isPdf = f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')

export default function GlobalDropOverlay({ onFiles }) {
  function handleDrop(e) {
    e.preventDefault()
    const files = [...e.dataTransfer.files].filter(isPdf)
    if (files.length) onFiles(files)
  }

  return (
    <div
      className="gdo-overlay"
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      role="region"
      aria-label="Drop zone active — release PDF files to add them"
    >
      {/* Animated glow ring */}
      <div className="gdo-ring" aria-hidden="true" />

      {/* Corner bracket accents */}
      <div className="gdo-corner tl" aria-hidden="true" />
      <div className="gdo-corner tr" aria-hidden="true" />
      <div className="gdo-corner bl" aria-hidden="true" />
      <div className="gdo-corner br" aria-hidden="true" />

      {/* Centre content */}
      <div className="gdo-body">
        <div className="gdo-icon" aria-hidden="true">📂</div>
        <h2 className="gdo-title">Drop PDFs anywhere</h2>
        <p className="gdo-sub">Release to add pages to your merge</p>
      </div>
    </div>
  )
}
