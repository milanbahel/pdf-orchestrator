import React, { useState } from 'react'
import { Pencil } from 'lucide-react'

/**
 * Interactive layer over the PDF canvas.
 *
 * Blocks fade in with a stagger (18 ms per block, max 400 ms delay).
 * All colour / border / shadow state is driven by React hover state
 * so CSS transitions run smoothly without conflicting with the entrance
 * animation keyframe.
 *
 * Props:
 *   blocks      – text blocks with coords in PDF user units (points)
 *   renderScale – zoom * 1.5; converts pts → CSS pixels
 *   edits       – applied edits array
 *   mode        – current app mode
 *   onEditBlock – callback when user clicks a block
 */
export default function TextOverlay({ blocks, edits, mode, renderScale, onEditBlock }) {
  const [hoverId, setHoverId] = useState(null)
  const isEditing = mode !== 'view'

  // Always render edits so replacements are visible in view mode too
  if (!isEditing && edits.length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none">
      {blocks.map((block, index) => {
        const edit     = edits.find((e) => e.blockId === block.id)
        const isEdited  = !!edit
        const isHovered = hoverId === block.id

        const cssLeft   = block.x      * renderScale
        const cssTop    = block.y      * renderScale
        const cssWidth  = Math.max(block.width  * renderScale, 8)
        const cssHeight = Math.max(block.height * renderScale, 8)

        // ── Derived visual state ───────────────────────────────────────
        const bg = isHovered
          ? 'rgba(59,130,246,0.18)'
          : isEdited
          ? 'rgba(52,211,153,0.10)'
          : 'rgba(59,130,246,0.05)'

        const border = isHovered
          ? 'rgba(59,130,246,0.85)'
          : isEdited
          ? 'rgba(52,211,153,0.60)'
          : 'rgba(59,130,246,0.28)'

        const shadow = isHovered
          ? '0 0 0 1.5px rgba(59,130,246,0.25), 0 2px 12px rgba(59,130,246,0.18)'
          : isEdited
          ? '0 0 0 1px rgba(52,211,153,0.18)'
          : 'none'

        return (
          <div
            key={block.id}
            className="absolute pointer-events-auto cursor-pointer rounded-[2px] border"
            style={{
              left:            cssLeft,
              top:             cssTop,
              width:           cssWidth,
              height:          cssHeight,
              backgroundColor: bg,
              borderColor:     border,
              boxShadow:       shadow,
              zIndex:          isHovered ? 10 : 1,
              // Entrance: staggered opacity fade (colours live in style above)
              animation:       'blockEntrance 0.35s ease-out both',
              animationDelay:  `${Math.min(index * 18, 400)}ms`,
              // Interactive transitions
              transition:      'background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
              cursor:          isEditing ? 'pointer' : 'default',
            }}
            onMouseEnter={() => setHoverId(block.id)}
            onMouseLeave={() => setHoverId(null)}
            onClick={() => isEditing && onEditBlock(block)}
          >
            {/* Replacement text preview (standard font) */}
            {isEdited && edit.newText && !edit.handwritingDataUrl && (
              <div
                className="absolute inset-0 flex items-center overflow-hidden bg-white px-0.5"
                style={{
                  fontFamily: edit.fontFamily || 'inherit',
                  fontSize:   Math.max(8, (edit.fontSize || block.fontSize) * renderScale),
                  color:      edit.color || '#111',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {edit.newText}
              </div>
            )}

            {/* Handwriting preview image */}
            {isEdited && edit.handwritingDataUrl && (
              <img
                src={edit.handwritingDataUrl}
                alt={edit.newText}
                className="absolute inset-0 w-full h-full object-contain object-left bg-white"
              />
            )}

            {/* Hover tooltip — font + text snippet */}
            {isHovered && isEditing && (
              <div
                className="absolute z-50 pointer-events-none"
                style={{ bottom: '100%', left: 0, marginBottom: 4 }}
              >
                <div
                  className="bg-gray-900 border border-gray-700 text-white text-xs px-2 py-1 rounded-md shadow-2xl whitespace-nowrap flex items-center gap-1.5"
                  style={{ animation: 'fadeIn 0.12s ease-out' }}
                >
                  <Pencil size={10} className="text-blue-400 flex-shrink-0" />
                  <span className="text-gray-200 max-w-[200px] truncate">{block.text}</span>
                  {block.fontName && (
                    <>
                      <span className="text-gray-600">·</span>
                      <span className="text-gray-400">
                        {block.fontName.replace(/^[A-Z]{6}\+/, '').split(',')[0]}
                      </span>
                    </>
                  )}
                  {block.confidence !== undefined && block.confidence < 100 && (
                    <>
                      <span className="text-gray-600">·</span>
                      <span className={block.confidence < 60 ? 'text-amber-400' : 'text-gray-400'}>
                        {block.confidence}%
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
