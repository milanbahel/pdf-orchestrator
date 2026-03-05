import React from 'react'
import {
  FileText,
  Cpu,
  Pencil,
  Wand2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  Type,
  Layers,
  PanelLeft,
} from 'lucide-react'

export default function Toolbar({
  mode,
  setMode,
  zoom,
  setZoom,
  currentPage,
  totalPages,
  setCurrentPage,
  onOCR,
  onExport,
  isProcessing,
  onNewFile,
  sidePanel,
  setSidePanel,
  editCount,
}) {
  const modes = [
    { id: 'view', icon: Eye, label: 'View' },
    { id: 'edit', icon: Type, label: 'Edit Text' },
    { id: 'ocr', icon: Cpu, label: 'OCR Scan' },
    { id: 'handwriting', icon: Wand2, label: 'Handwriting' },
  ]

  const sidePanels = [
    { id: 'fonts', icon: Layers, label: 'Fonts' },
    { id: 'edits', icon: Pencil, label: `Edits${editCount ? ` (${editCount})` : ''}` },
    { id: 'info', icon: FileText, label: 'Info' },
  ]

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 border-b border-gray-800 overflow-x-auto">
      {/* Logo / new file */}
      <button
        onClick={onNewFile}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium transition-colors flex-shrink-0"
        title="Open new file"
      >
        <FileText size={14} className="text-blue-400" />
        <span className="hidden sm:inline">PDF Editor</span>
      </button>

      <div className="w-px h-6 bg-gray-700 flex-shrink-0" />

      {/* Mode selector */}
      <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1 flex-shrink-0">
        {modes.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all
              ${mode === id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }
            `}
            title={label}
          >
            <Icon size={13} />
            <span className="hidden md:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* OCR run button */}
      {(mode === 'ocr' || mode === 'handwriting') && (
        <button
          onClick={onOCR}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {isProcessing ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Cpu size={13} />
          )}
          {mode === 'handwriting' ? 'Analyse Handwriting' : 'Run OCR'}
        </button>
      )}

      <div className="flex-1" />

      {/* Zoom controls */}
      <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1 flex-shrink-0">
        <button
          onClick={() => setZoom((z) => Math.max(0.4, z - 0.25))}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={14} />
        </button>
        <span className="text-gray-300 text-xs w-10 text-center font-mono">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          title="Reset zoom"
        >
          <RotateCcw size={12} />
        </button>
      </div>

      <div className="w-px h-6 bg-gray-700 flex-shrink-0" />

      {/* Page navigation */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-gray-300 text-xs w-16 text-center">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage >= totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="w-px h-6 bg-gray-700 flex-shrink-0" />

      {/* Side panel toggle */}
      <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1 flex-shrink-0">
        {sidePanels.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setSidePanel(sidePanel === id ? null : id)}
            className={`
              flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all
              ${sidePanel === id
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-200'
              }
            `}
            title={label}
          >
            <Icon size={12} />
            <span className="hidden lg:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Export */}
      <button
        onClick={onExport}
        disabled={isProcessing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors disabled:opacity-50 flex-shrink-0"
        title="Download edited PDF"
      >
        {isProcessing ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Download size={13} />
        )}
        Export PDF
      </button>
    </div>
  )
}
