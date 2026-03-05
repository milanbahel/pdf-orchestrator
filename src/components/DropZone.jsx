import { useRef } from 'react'

const isPdf = f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')

export default function DropZone({ onFiles, compact }) {
  const inputRef = useRef(null)

  function handleDrop(e) {
    e.preventDefault()
    e.currentTarget.classList.remove('over')
    const files = [...e.dataTransfer.files].filter(isPdf)
    if (files.length) onFiles(files)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      inputRef.current?.click()
    }
  }

  return (
    <div
      className={`drop-zone${compact ? ' compact' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={compact ? 'Drop more PDF files here, or press Enter to browse' : 'Drop PDF files here, or press Enter to browse'}
      onClick={() => inputRef.current?.click()}
      onKeyDown={handleKeyDown}
      onDragEnter={e => { e.preventDefault(); if (e.dataTransfer.types?.includes('Files')) e.currentTarget.classList.add('over') }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove('over') }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf"
        hidden
        aria-hidden="true"
        tabIndex={-1}
        onChange={e => { onFiles([...e.target.files]); e.target.value = '' }}
      />
      <div className="dz-icon" aria-hidden="true">📂</div>
      <h2>{compact ? 'Drop more PDFs here' : 'Drop PDF files here'}</h2>
      {!compact && <p>or <span className="browse">click to browse</span> — nothing leaves your browser until merge</p>}
    </div>
  )
}
