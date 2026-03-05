/**
 * Renders text using a handwriting-style font on a canvas,
 * applying per-character micro-variations so it looks naturally hand-written
 * rather than AI-generated or copy-pasted.
 *
 * Variation dimensions:
 *  - rotation:         ±3° per character (seeded so consistent on re-render)
 *  - baseline offset:  ±3% of font size
 *  - scale:            ±2% per character
 *  - letter spacing:   ±4% between characters
 *  - ink opacity:      94–100% (simulates pen pressure)
 */
export function renderHandwritingToCanvas(text, fontFamily, fontSize, options = {}) {
  const {
    color = '#1a1a1a',
    bgColor = null, // null = transparent
    paddingX = fontSize * 0.4,
    paddingY = fontSize * 0.6,
    seed = text, // deterministic seed for consistent output
  } = options

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  // Measure characters first
  ctx.font = `${fontSize}px ${fontFamily}`
  const charMeasures = []
  let totalWidth = 0

  for (const char of text) {
    const m = ctx.measureText(char)
    charMeasures.push(m.width)
    totalWidth += m.width
  }

  canvas.width = Math.ceil(totalWidth * 1.15 + paddingX * 2)
  canvas.height = Math.ceil(fontSize * 2 + paddingY * 2)

  if (bgColor) {
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.textBaseline = 'alphabetic'

  let x = paddingX
  const baseY = paddingY + fontSize

  // Simple deterministic pseudo-random from seed string
  const rng = seededRng(seed)

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const charW = charMeasures[i]

    // Per-character variations
    const rotation = (rng() - 0.5) * 0.055 // ±~3°
    const baselineShift = (rng() - 0.5) * (fontSize * 0.06)
    const scaleFactor = 1 + (rng() - 0.5) * 0.04
    const spacingFactor = 1 + (rng() - 0.5) * 0.08
    const opacity = 0.93 + rng() * 0.07 // 93–100%

    ctx.save()
    ctx.globalAlpha = opacity
    ctx.translate(x + charW / 2, baseY + baselineShift)
    ctx.rotate(rotation)
    ctx.scale(scaleFactor, scaleFactor)
    ctx.fillStyle = color
    ctx.fillText(char, -charW / 2, 0)
    ctx.restore()

    x += charW * spacingFactor
  }

  return canvas
}

/**
 * Generate a canvas preview of text in a specific font (without per-char variation).
 * Used for font preview swatches in the UI.
 */
export function renderFontPreview(text, fontFamily, fontSize = 20, color = '#1a1a1a') {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  ctx.font = `${fontSize}px ${fontFamily}`
  const width = ctx.measureText(text).width
  canvas.width = Math.ceil(width + 20)
  canvas.height = Math.ceil(fontSize * 2)

  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = color
  ctx.fillText(text, 10, fontSize + 4)

  return canvas.toDataURL()
}

/**
 * Estimate a matching ink color by sampling the canvas at a given region.
 * Returns hex color string.
 */
export function sampleInkColor(pageCanvas, x, y, width, height) {
  try {
    const ctx = pageCanvas.getContext('2d')
    const sampleW = Math.min(width, 30)
    const sampleH = Math.min(height, 16)
    const imgData = ctx.getImageData(
      Math.max(0, x),
      Math.max(0, y),
      sampleW,
      sampleH
    )

    let r = 0, g = 0, b = 0, count = 0
    const data = imgData.data

    for (let i = 0; i < data.length; i += 4) {
      const pr = data[i], pg = data[i + 1], pb = data[i + 2]
      // Only consider dark pixels (likely ink, not background)
      if (pr < 160 && pg < 160 && pb < 160) {
        r += pr; g += pg; b += pb; count++
      }
    }

    if (count === 0) return '#1a1a1a'

    r = Math.round(r / count)
    g = Math.round(g / count)
    b = Math.round(b / count)

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  } catch {
    return '#1a1a1a'
  }
}

/** Simple seeded pseudo-random number generator (Mulberry32) */
function seededRng(seed) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0
  }
  let state = hash >>> 0 || 1

  return function () {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
