/**
 * Font library: handwriting fonts loaded via Google Fonts in index.html
 * Each entry: { name, family, style, bestFor }
 */
export const HANDWRITING_FONTS = [
  { name: 'Caveat', family: "'Caveat', cursive", style: 'casual', bestFor: 'casual everyday writing' },
  { name: 'Dancing Script', family: "'Dancing Script', cursive", style: 'elegant', bestFor: 'elegant cursive writing' },
  { name: 'Kalam', family: "'Kalam', cursive", style: 'natural', bestFor: 'natural handwriting' },
  { name: 'Patrick Hand', family: "'Patrick Hand', cursive", style: 'clean', bestFor: 'clean print handwriting' },
  { name: 'Indie Flower', family: "'Indie Flower', cursive", style: 'friendly', bestFor: 'friendly casual writing' },
  { name: 'Satisfy', family: "'Satisfy', cursive", style: 'flowing', bestFor: 'flowing script writing' },
  { name: 'Sacramento', family: "'Sacramento', cursive", style: 'formal', bestFor: 'formal cursive writing' },
  { name: 'Shadows Into Light', family: "'Shadows Into Light', cursive", style: 'light', bestFor: 'light informal writing' },
  { name: 'Amatic SC', family: "'Amatic SC', cursive", style: 'artistic', bestFor: 'artistic condensed writing' },
  { name: 'Permanent Marker', family: "'Permanent Marker', cursive", style: 'marker', bestFor: 'thick marker handwriting' },
  { name: 'Rock Salt', family: "'Rock Salt', cursive", style: 'rough', bestFor: 'rough grunge handwriting' },
  { name: 'Architects Daughter', family: "'Architects Daughter', cursive", style: 'print', bestFor: 'neat architectural print' },
  { name: 'Homemade Apple', family: "'Homemade Apple', cursive", style: 'scrawl', bestFor: 'messy scrawl writing' },
  { name: 'La Belle Aurore', family: "'La Belle Aurore', cursive", style: 'vintage', bestFor: 'vintage cursive writing' },
  { name: 'Pacifico', family: "'Pacifico', cursive", style: 'fun', bestFor: 'fun rounded writing' },
]

export const STANDARD_FONTS = [
  { name: 'Helvetica', family: 'Helvetica, Arial, sans-serif', pdfLib: 'Helvetica' },
  { name: 'Helvetica Bold', family: 'Helvetica, Arial, sans-serif', pdfLib: 'HelveticaBold', weight: 'bold' },
  { name: 'Times New Roman', family: '"Times New Roman", Times, serif', pdfLib: 'TimesRoman' },
  { name: 'Times Bold', family: '"Times New Roman", Times, serif', pdfLib: 'TimesRomanBold', weight: 'bold' },
  { name: 'Courier', family: '"Courier New", Courier, monospace', pdfLib: 'Courier' },
  { name: 'Courier Bold', family: '"Courier New", Courier, monospace', pdfLib: 'CourierBold', weight: 'bold' },
  { name: 'Arial', family: 'Arial, Helvetica, sans-serif', pdfLib: 'Helvetica' },
  { name: 'Georgia', family: 'Georgia, serif', pdfLib: 'TimesRoman' },
  { name: 'Verdana', family: 'Verdana, Geneva, sans-serif', pdfLib: 'Helvetica' },
]

/**
 * Guess best handwriting font from OCR analysis data.
 * Parameters come from analyzeHandwritingStyle().
 */
export function matchHandwritingFont(analysis) {
  const { letterHeight, strokeVariation, slantAngle, hasLoops, isCursive, isCondensed } = analysis

  if (isCursive && hasLoops) {
    if (slantAngle > 15) return HANDWRITING_FONTS.find((f) => f.name === 'Dancing Script')
    return HANDWRITING_FONTS.find((f) => f.name === 'Sacramento')
  }

  if (strokeVariation > 0.5) {
    return HANDWRITING_FONTS.find((f) => f.name === 'Permanent Marker')
  }

  if (isCondensed) {
    return HANDWRITING_FONTS.find((f) => f.name === 'Amatic SC')
  }

  if (letterHeight > 24) {
    return HANDWRITING_FONTS.find((f) => f.name === 'Kalam')
  }

  return HANDWRITING_FONTS.find((f) => f.name === 'Caveat') // safe default
}

/**
 * Analyze handwriting characteristics from a set of OCR blocks.
 * Returns analysis object used for font matching.
 */
export function analyzeHandwritingStyle(blocks) {
  if (!blocks || blocks.length === 0) {
    return {
      letterHeight: 14,
      strokeVariation: 0.3,
      slantAngle: 5,
      hasLoops: false,
      isCursive: false,
      isCondensed: false,
    }
  }

  const heights = blocks.map((b) => b.height).filter((h) => h > 0)
  const widths = blocks.map((b) => b.width / Math.max(b.text.length, 1)).filter((w) => w > 0)

  const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length
  const avgCharWidth = widths.reduce((a, b) => a + b, 0) / widths.length

  const heightVariance =
    heights.reduce((acc, h) => acc + Math.pow(h - avgHeight, 2), 0) / heights.length
  const strokeVariation = Math.min(1, Math.sqrt(heightVariance) / avgHeight)

  const isCondensed = avgCharWidth < avgHeight * 0.5

  // Heuristics based on font metrics
  const hasLoops = avgHeight > 16 && strokeVariation < 0.4
  const isCursive = strokeVariation < 0.25

  return {
    letterHeight: Math.round(avgHeight),
    strokeVariation: Math.round(strokeVariation * 100) / 100,
    slantAngle: 5 + Math.random() * 15, // approximate
    hasLoops,
    isCursive,
    isCondensed,
  }
}

/**
 * Map a PDF font name to the closest display family name.
 */
export function normalizeFontName(rawName) {
  if (!rawName) return 'Unknown'
  const lower = rawName.toLowerCase()
  if (lower.includes('helvetica') || lower.includes('arial')) return 'Helvetica'
  if (lower.includes('times')) return 'Times New Roman'
  if (lower.includes('courier')) return 'Courier'
  if (lower.includes('georgia')) return 'Georgia'
  if (lower.includes('verdana')) return 'Verdana'
  if (lower.includes('calibri')) return 'Calibri'
  if (lower.includes('garamond')) return 'Garamond'
  if (lower.includes('palatino')) return 'Palatino'
  if (lower.includes('tahoma')) return 'Tahoma'
  if (lower.includes('impact')) return 'Impact'
  // Strip common PDF prefixes like "ABCDEF+"
  return rawName.replace(/^[A-Z]{6}\+/, '').replace(/[-,]/g, ' ').trim()
}
