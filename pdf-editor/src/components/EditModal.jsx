import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X, Wand2, Type, Check, AlertCircle } from 'lucide-react'
import { HANDWRITING_FONTS, STANDARD_FONTS, matchHandwritingFont, analyzeHandwritingStyle } from '../utils/fontMatcher'
import { renderHandwritingToCanvas, sampleInkColor } from '../utils/handwritingFont'

export default function EditModal({ block, edits, onSave, onClose, mode, detectedFonts }) {
  const existingEdit = edits.find((e) => e.blockId === block.id)

  const [newText, setNewText] = useState(existingEdit?.newText ?? block.text)
  const [selectedFont, setSelectedFont] = useState(
    existingEdit?.fontFamily || (block.isHandwritten ? 'Caveat' : null)
  )
  const [fontSize, setFontSize] = useState(existingEdit?.fontSize ?? block.fontSize ?? 14)
  const [useHandwritingMode, setUseHandwritingMode] = useState(
    mode === 'handwriting' || block.isHandwritten
  )
  const [suggestedFont, setSuggestedFont] = useState(null)
  const [previewDataUrl, setPreviewDataUrl] = useState(null)
  const [inkColor, setInkColor] = useState(existingEdit?.color || '#1a1a1a')
  const [activeTab, setActiveTab] = useState(useHandwritingMode ? 'handwriting' : 'standard')

  const previewTimeoutRef = useRef(null)

  // Analyse and suggest font on open
  useEffect(() => {
    if (useHandwritingMode || block.isHandwritten) {
      const analysis = analyzeHandwritingStyle([block])
      const font = matchHandwritingFont(analysis)
      setSuggestedFont(font)
      if (!existingEdit?.fontFamily) {
        setSelectedFont(font?.name || 'Caveat')
      }

      // Sample ink color from page canvas
      if (block.pageCanvas) {
        const sampled = sampleInkColor(block.pageCanvas, block.x, block.y, block.width, block.height)
        setInkColor(sampled)
      }
    }
  }, [block, useHandwritingMode, existingEdit])

  // Auto-preview handwriting
  const updatePreview = useCallback(() => {
    if (!useHandwritingMode || !selectedFont || !newText) {
      setPreviewDataUrl(null)
      return
    }
    const font = HANDWRITING_FONTS.find((f) => f.name === selectedFont)
    if (!font) return
    const canvas = renderHandwritingToCanvas(newText, font.family, fontSize, { color: inkColor })
    setPreviewDataUrl(canvas.toDataURL())
  }, [useHandwritingMode, selectedFont, newText, fontSize, inkColor])

  useEffect(() => {
    clearTimeout(previewTimeoutRef.current)
    previewTimeoutRef.current = setTimeout(updatePreview, 300)
    return () => clearTimeout(previewTimeoutRef.current)
  }, [updatePreview])

  const handleSave = () => {
    const editData = {
      blockId: block.id,
      pageIndex: block.pageNum - 1,
      x: block.x,
      y: block.y,
      width: block.width,
      height: block.height,
      originalText: block.text,
      newText,
      fontSize,
      color: inkColor,
    }

    if (useHandwritingMode && selectedFont) {
      const font = HANDWRITING_FONTS.find((f) => f.name === selectedFont)
      if (font) {
        const canvas = renderHandwritingToCanvas(newText, font.family, fontSize, { color: inkColor })
        editData.handwritingCanvas = canvas
        editData.handwritingDataUrl = canvas.toDataURL()
        editData.fontFamily = font.family
        editData.chosenFont = null // image embedding
      }
    } else {
      const stdFont = STANDARD_FONTS.find((f) => f.name === selectedFont || f.family === selectedFont)
      editData.fontFamily = stdFont?.family || selectedFont || 'Helvetica, sans-serif'
      editData.chosenFont = stdFont?.pdfLib || 'Helvetica'
    }

    onSave(editData)
  }

  const handwritingFontList = HANDWRITING_FONTS
  const standardFontList = STANDARD_FONTS

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      style={{ animation: 'backdropFade 0.2s ease-out' }}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        style={{ animation: 'slideUpModal 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-white font-semibold text-base">Edit Text Block</h2>
            <p className="text-gray-500 text-xs mt-0.5">
              Font: {block.fontName} · Size: {block.fontSize}px
              {block.confidence !== undefined && block.confidence < 100
                ? ` · OCR confidence: ${block.confidence}%`
                : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Original text */}
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
              Original
            </label>
            <div className="bg-gray-800/60 rounded-lg px-3 py-2 text-gray-400 text-sm font-mono border border-gray-700/50 select-all">
              {block.text || '(empty)'}
            </div>
          </div>

          {/* New text */}
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
              Replacement Text
            </label>
            <textarea
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
              rows={2}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              autoFocus
            />
          </div>

          {/* Mode tabs */}
          <div>
            <div className="flex rounded-lg bg-gray-800 p-1 gap-1 mb-3">
              <button
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm transition-all ${
                  activeTab === 'standard'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                onClick={() => { setActiveTab('standard'); setUseHandwritingMode(false) }}
              >
                <Type size={13} /> Standard Font
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm transition-all ${
                  activeTab === 'handwriting'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                onClick={() => { setActiveTab('handwriting'); setUseHandwritingMode(true) }}
              >
                <Wand2 size={13} /> Handwriting Mode
              </button>
            </div>

            {activeTab === 'handwriting' && suggestedFont && (
              <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 mb-3">
                <AlertCircle size={13} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-blue-300 text-xs">
                  AI suggests <strong>{suggestedFont.name}</strong> — best matches this handwriting style ({suggestedFont.bestFor}).
                  Micro-variations applied per character for natural appearance.
                </p>
              </div>
            )}

            {/* Font grid */}
            <div className="max-h-44 overflow-y-auto custom-scroll">
              <div className="grid grid-cols-2 gap-1.5">
                {(activeTab === 'handwriting' ? handwritingFontList : standardFontList).map((font) => {
                  const isSuggested = suggestedFont?.name === font.name && activeTab === 'handwriting'
                  const isSelected = selectedFont === font.name
                  return (
                    <button
                      key={font.name}
                      className={`
                        relative text-left px-3 py-2 rounded-lg border text-sm transition-all
                        ${isSelected
                          ? 'border-blue-500 bg-blue-500/10 text-white'
                          : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-500 hover:bg-gray-800'
                        }
                      `}
                      style={{ fontFamily: font.family }}
                      onClick={() => setSelectedFont(font.name)}
                    >
                      {isSuggested && (
                        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                          <Wand2 size={8} className="text-white" />
                        </span>
                      )}
                      <span className="block text-base leading-tight">{font.name}</span>
                      <span className="block text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'inherit' }}>
                        The quick brown fox
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Font size + ink color */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
                Font Size
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={6}
                  max={72}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="flex-1 accent-blue-500"
                />
                <span className="text-white text-sm w-8 text-right">{fontSize}</span>
              </div>
            </div>
            {activeTab === 'handwriting' && (
              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
                  Ink Color
                </label>
                <input
                  type="color"
                  value={inkColor}
                  onChange={(e) => setInkColor(e.target.value)}
                  className="w-10 h-8 rounded cursor-pointer border border-gray-700 bg-transparent"
                />
              </div>
            )}
          </div>

          {/* Handwriting preview */}
          {activeTab === 'handwriting' && previewDataUrl && (
            <div>
              <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
                Preview (with natural variations)
              </label>
              <div className="bg-white rounded-lg p-3 flex items-center justify-center min-h-12">
                <img src={previewDataUrl} alt="Preview" className="max-w-full max-h-16 object-contain" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!newText.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check size={14} />
            Apply Edit
          </button>
        </div>
      </div>
    </div>
  )
}
