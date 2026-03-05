import React, { useCallback, useState } from 'react'
import { Upload, FileText, Cpu, Eye, Pencil, Wand2 } from 'lucide-react'

export default function DropZone({ onFileLoad }) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  const processFile = useCallback(
    (file) => {
      if (!file) return
      if (file.type !== 'application/pdf') {
        setError('Please upload a PDF file.')
        return
      }
      setError('')
      onFileLoad(file)
    },
    [onFileLoad]
  )

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      setDragging(false)
      processFile(e.dataTransfer.files[0])
    },
    [processFile]
  )

  const handleChange = useCallback(
    (e) => processFile(e.target.files[0]),
    [processFile]
  )

  const features = [
    { icon: Eye, label: 'Native PDF text extraction', sub: 'All fonts & positions preserved' },
    { icon: Cpu, label: 'AI-powered OCR', sub: 'Scanned & image-based PDFs' },
    { icon: Pencil, label: 'Handwriting recognition', sub: 'Detect & analyse cursive writing' },
    { icon: Wand2, label: 'Seamless font matching', sub: 'Generate matching handwriting fonts' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-4">
          <Cpu size={14} className="text-blue-400" />
          <span className="text-blue-300 text-xs font-medium tracking-wide uppercase">AI PDF Editor</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
          Intelligent PDF Editing
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Upload any PDF — native, scanned, or handwritten. Edit text with perfect font matching.
        </p>
      </div>

      {/* Drop zone */}
      <label
        className={`
          relative w-full max-w-xl rounded-2xl border-2 border-dashed cursor-pointer
          transition-all duration-200 p-10 flex flex-col items-center gap-4
          ${dragging
            ? 'border-blue-400 bg-blue-500/10 scale-[1.01]'
            : 'border-gray-700 bg-gray-900 hover:border-gray-500 hover:bg-gray-800'
          }
        `}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
      >
        <input
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleChange}
        />

        <div className={`
          w-16 h-16 rounded-2xl flex items-center justify-center transition-colors
          ${dragging ? 'bg-blue-500/20' : 'bg-gray-800'}
        `}>
          <Upload size={28} className={dragging ? 'text-blue-400' : 'text-gray-400'} />
        </div>

        <div className="text-center">
          <p className="text-white font-semibold text-lg">
            {dragging ? 'Drop your PDF here' : 'Drop PDF or click to browse'}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            Supports all PDFs — native text, scanned pages, handwritten documents
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-600">
          <FileText size={12} />
          <span>PDF files only · Any size</span>
        </div>
      </label>

      {error && (
        <p className="mt-3 text-red-400 text-sm">{error}</p>
      )}

      {/* Feature grid */}
      <div className="grid grid-cols-2 gap-3 mt-8 w-full max-w-xl">
        {features.map(({ icon: Icon, label, sub }) => (
          <div
            key={label}
            className="flex items-start gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4"
          >
            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon size={15} className="text-blue-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">{label}</p>
              <p className="text-gray-500 text-xs mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
