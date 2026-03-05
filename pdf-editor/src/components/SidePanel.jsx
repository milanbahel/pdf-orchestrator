import React from 'react'
import { Layers, Pencil, FileText, Trash2, ChevronRight, Type } from 'lucide-react'
import { normalizeFontName, HANDWRITING_FONTS } from '../utils/fontMatcher'
import { renderFontPreview } from '../utils/handwritingFont'

export default function SidePanel({ activePanel, detectedFonts, textBlocks, edits, mode }) {
  if (!activePanel) return null

  return (
    <div
      className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden flex-shrink-0"
      style={{ animation: 'panelSlideIn 0.2s ease-out' }}
    >
      {activePanel === 'fonts' && (
        <FontsPanel detectedFonts={detectedFonts} />
      )}
      {activePanel === 'edits' && (
        <EditsPanel edits={edits} />
      )}
      {activePanel === 'info' && (
        <InfoPanel textBlocks={textBlocks} edits={edits} mode={mode} />
      )}
    </div>
  )
}

function FontsPanel({ detectedFonts }) {
  const normalized = [...new Set(detectedFonts.map(normalizeFontName))].filter(Boolean)

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-blue-400" />
          <h3 className="text-white text-sm font-medium">Detected Fonts</h3>
        </div>
        <p className="text-gray-500 text-xs mt-0.5">{normalized.length} font(s) in document</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {normalized.length === 0 ? (
          <p className="text-gray-600 text-xs text-center py-8">
            No fonts extracted yet.<br />
            Open a PDF to detect fonts.
          </p>
        ) : (
          normalized.map((fontName) => (
            <div
              key={fontName}
              className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2.5"
            >
              <p className="text-white text-sm font-medium truncate">{fontName}</p>
              <p className="text-gray-400 text-xs mt-1 truncate" style={{ fontFamily: fontName }}>
                Aa Bb Cc — The quick fox
              </p>
            </div>
          ))
        )}

        {/* Handwriting fonts section */}
        <div className="pt-2">
          <p className="text-gray-600 text-xs font-medium uppercase tracking-wide px-1 mb-2">
            Handwriting Fonts Available
          </p>
          {HANDWRITING_FONTS.map((font) => (
            <div
              key={font.name}
              className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-800/50 transition-colors cursor-default"
            >
              <Type size={10} className="text-gray-600 flex-shrink-0" />
              <div className="min-w-0">
                <span
                  className="text-gray-300 text-sm leading-none block"
                  style={{ fontFamily: font.family }}
                >
                  {font.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function EditsPanel({ edits }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Pencil size={14} className="text-emerald-400" />
          <h3 className="text-white text-sm font-medium">Edits</h3>
        </div>
        <p className="text-gray-500 text-xs mt-0.5">{edits.length} pending change(s)</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {edits.length === 0 ? (
          <div className="text-center py-8">
            <Pencil size={20} className="text-gray-700 mx-auto mb-2" />
            <p className="text-gray-600 text-xs">
              No edits yet.<br />
              Switch to Edit mode and click any text.
            </p>
          </div>
        ) : (
          edits.map((edit, i) => (
            <div
              key={edit.blockId}
              className="bg-gray-800/50 border border-emerald-700/30 rounded-lg px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-gray-500 text-xs truncate line-through">
                    {edit.originalText}
                  </p>
                  <p className="text-white text-sm truncate mt-0.5">
                    {edit.newText}
                  </p>
                </div>
                <ChevronRight size={12} className="text-gray-600 flex-shrink-0 mt-1" />
              </div>
              {edit.fontFamily && (
                <p className="text-gray-600 text-xs mt-1 truncate">
                  Font: {edit.fontFamily?.split(',')[0]?.replace(/['"]/g, '') || 'Default'}
                </p>
              )}
              {edit.handwritingDataUrl && (
                <div className="mt-2 bg-white rounded p-1">
                  <img src={edit.handwritingDataUrl} alt="" className="max-h-8 object-contain" />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {edits.length > 0 && (
        <div className="p-3 border-t border-gray-800">
          <p className="text-gray-600 text-xs text-center">
            Click "Export PDF" in the toolbar to apply all edits.
          </p>
        </div>
      )}
    </div>
  )
}

function InfoPanel({ textBlocks, edits, mode }) {
  const wordCount = textBlocks.reduce((acc, b) => acc + (b.text?.split(/\s+/).length || 0), 0)
  const handwrittenCount = textBlocks.filter((b) => b.isHandwritten).length
  const ocrCount = textBlocks.filter((b) => b.source === 'ocr').length
  const nativeCount = textBlocks.filter((b) => b.source === 'native').length

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-purple-400" />
          <h3 className="text-white text-sm font-medium">Document Info</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <InfoRow label="Text blocks" value={textBlocks.length} />
        <InfoRow label="Native text" value={nativeCount} />
        <InfoRow label="OCR detected" value={ocrCount} />
        <InfoRow label="Handwritten" value={handwrittenCount} />
        <InfoRow label="Word estimate" value={wordCount} />
        <InfoRow label="Pending edits" value={edits.length} highlight={edits.length > 0} />

        <div className="pt-2">
          <p className="text-gray-600 text-xs font-medium uppercase tracking-wide px-1 mb-2">
            Current Mode
          </p>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2">
            <p className="text-white text-sm capitalize">{mode}</p>
            <p className="text-gray-500 text-xs mt-0.5">
              {mode === 'view' && 'Read-only — no text interaction'}
              {mode === 'edit' && 'Click any text block to edit content and font'}
              {mode === 'ocr' && 'Run OCR to detect text in scanned pages'}
              {mode === 'handwriting' && 'Analyse and replace handwritten text with AI font'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className={`text-sm font-medium ${highlight ? 'text-emerald-400' : 'text-white'}`}>
        {value}
      </span>
    </div>
  )
}
