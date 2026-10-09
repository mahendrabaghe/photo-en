import { useState, useEffect } from 'react'
import {
  ZoomIn, ZoomOut, RotateCcw, Download, Sparkles,
  Maximize2, Minimize2, Crop, Palette, RefreshCw, X
} from 'lucide-react'
import { formatBytes, downloadBlob } from '../services/api'

const TOOLS = [
  { id: 'enhance',  icon: Sparkles,   label: 'AI Enhance' },
  { id: 'resize',   icon: Maximize2,  label: 'Resize'     },
  { id: 'compress', icon: Minimize2,  label: 'Compress'   },
  { id: 'crop',     icon: Crop,       label: 'Crop'       },
  { id: 'filters',  icon: Palette,    label: 'Filters'    },
  { id: 'convert',  icon: RefreshCw,  label: 'Convert'    },
]

export default function ImageWorkspace({
  originalFile,
  currentBlob,
  currentTool,
  onToolChange,
  onReset,
  onClose,
  imageInfo,
}) {
  const [zoom, setZoom] = useState(1)
  const [originalURL, setOriginalURL] = useState(null)
  const [currentURL, setCurrentURL] = useState(null)

  useEffect(() => {
    if (originalFile) {
      const url = URL.createObjectURL(originalFile)
      setOriginalURL(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [originalFile])

  useEffect(() => {
    if (currentBlob) {
      const url = URL.createObjectURL(currentBlob)
      setCurrentURL(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setCurrentURL(null)
    }
  }, [currentBlob])

  const handleDownload = () => {
    if (currentBlob) {
      const ext = currentBlob.type.split('/')[1] || 'png'
      downloadBlob(currentBlob, `edited.${ext === 'jpeg' ? 'jpg' : ext}`)
    } else if (originalFile) {
      downloadBlob(originalFile, originalFile.name)
    }
  }

  const previewURL = currentURL || originalURL
  const previewSize = currentBlob ? currentBlob.size : originalFile?.size

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade-in">
      {/* Toolbar */}
      <div className="card mb-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: image info */}
          <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
            {imageInfo && (
              <>
                <span className="font-medium text-gray-800">{originalFile?.name}</span>
                <span>{imageInfo.width} × {imageInfo.height} px</span>
                <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium uppercase">
                  {imageInfo.format}
                </span>
                <span>{formatBytes(previewSize || 0)}</span>
              </>
            )}
          </div>
          {/* Right: controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Zoom out"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(z => Math.min(4, z + 0.25))}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Zoom in"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <button
              onClick={onReset}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
              aria-label="Reset to original"
              title="Reset to original"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              className="btn-primary btn-sm flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors text-gray-400"
              aria-label="Close workspace"
              title="Close workspace"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tool tabs */}
      <div className="card mb-4 p-2">
        <div className="flex flex-wrap gap-1">
          {TOOLS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => onToolChange(id)}
              className={`tool-tab ${currentTool === id ? 'tool-tab-active' : 'tool-tab-inactive'}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Preview area */}
      <div className="card overflow-hidden mb-4 flex items-center justify-center min-h-48 bg-gray-50">
        {previewURL ? (
          <div
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.2s' }}
            className="max-w-full"
          >
            <img
              src={previewURL}
              alt="Preview"
              className="max-w-full max-h-[50vh] object-contain rounded-lg shadow"
            />
          </div>
        ) : (
          <div className="text-gray-400 text-sm">No image loaded</div>
        )}
      </div>

      {/* Status bar */}
      {currentBlob && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-xl border border-green-200">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          Edited version ready · {formatBytes(currentBlob.size)}
          <span className="text-gray-400 ml-auto text-xs">Original: {formatBytes(originalFile?.size || 0)}</span>
        </div>
      )}
    </div>
  )
}
