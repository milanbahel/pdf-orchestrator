import { useState } from 'react'

export default function ActionBar({ visible, selectedCount, isMerging, status, onMerge }) {
  const [filename, setFilename] = useState('merged')

  if (!visible) return null

  function handleClick() {
    const name = (filename.trim() || 'merged').replace(/\.pdf$/i, '') + '.pdf'
    onMerge(name)
  }

  const btnLabel = isMerging
    ? 'Merging…'
    : selectedCount > 0
      ? `Merge ${selectedCount} Page${selectedCount !== 1 ? 's' : ''}`
      : 'Select pages to merge'

  return (
    <div className="action-bar" role="region" aria-label="Merge settings">
      <div className="ab-inner">
        <div className="ab-main">
          {/* Filename input */}
          <div className="fn-group">
            <label htmlFor="outputName">Output filename</label>
            <div className="fn-row">
              <input
                id="outputName"
                type="text"
                value={filename}
                onChange={e => setFilename(e.target.value)}
                spellCheck={false}
                placeholder="merged"
                aria-describedby="fn-ext-hint"
              />
              <span className="ext" id="fn-ext-hint" aria-label="dot pdf extension">.pdf</span>
            </div>
          </div>

          {/* Merge button */}
          <div className="ab-right">
            <button
              className={`merge-btn${isMerging ? ' loading' : ''}`}
              disabled={selectedCount === 0 || isMerging}
              onClick={handleClick}
              aria-label={isMerging ? 'Merging in progress' : btnLabel}
            >
              {isMerging && (
                <>
                  <span className="spin" aria-hidden="true" />
                  <span className="sr-only">Merging, please wait</span>
                </>
              )}
              <span aria-hidden={isMerging}>{btnLabel}</span>
            </button>
          </div>
        </div>

        {/* Status message — always in DOM for aria-live announcements */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={status ? `status ${status.type}` : 'sr-only'}
        >
          {status?.msg ?? ''}
        </div>
      </div>
    </div>
  )
}
