import { useState, useEffect } from 'react'
import { Maximize2, Download, Lock, Unlock, Info } from 'lucide-react'
import { resizeImage, downloadBlob, formatBytes } from '../../services/api'

const PRESETS = [
  { label: '6×6 cm', w: 6, h: 6, unit: 'cm' },
  { label: '4×6 cm', w: 4, h: 6, unit: 'cm' },
  { label: '3.5×4.5 cm', w: 3.5, h: 4.5, unit: 'cm' },
  { label: '2×2 cm', w: 2, h: 2, unit: 'cm' },
  { label: '2×2.5 cm', w: 2, h: 2.5, unit: 'cm' },
  { label: '1920×1080 px', w: 1920, h: 1080, unit: 'pixels' },
  { label: '1280×720 px', w: 1280, h: 720, unit: 'pixels' },
  { label: '800×600 px', w: 800, h: 600, unit: 'pixels' },
]

const DPI_OPTIONS = [72, 96, 150, 200, 300]

function cmToPixels(cm, dpi) { return Math.round((cm / 2.54) * dpi) }
function mmToPixels(mm, dpi) { return Math.round((mm / 25.4) * dpi) }
function inchesToPixels(inches, dpi) { return Math.round(inches * dpi) }

function toPixels(val, unit, dpi) {
  if (unit === 'cm') return cmToPixels(val, dpi)
  if (unit === 'mm') return mmToPixels(val, dpi)
  if (unit === 'inches') return inchesToPixels(val, dpi)
  return Math.round(val)
}

export default function ResizeTool({ file, imageInfo, onResult }) {
  const [width, setWidth]       = useState('')
  const [height, setHeight]     = useState('')
  const [unit, setUnit]         = useState('pixels')
  const [dpi, setDpi]           = useState(96)
  const [mode, setMode]         = useState('fit')
  const [locked, setLocked]     = useState(true)
  const [outputFmt, setOutputFmt] = useState('PNG')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [result, setResult]     = useState(null)

  // Seed from image info
  useEffect(() => {
    if (imageInfo) {
      setWidth(String(imageInfo.width))
      setHeight(String(imageInfo.height))
    }
  }, [imageInfo])

  const aspectRatio = imageInfo ? imageInfo.width / imageInfo.height : 1

  const onWidthChange = (val) => {
    setWidth(val)
    if (locked && val && !isNaN(val)) {
      const wPx = toPixels(parseFloat(val), unit, dpi)
      const hPx = Math.round(wPx / aspectRatio)
      // Convert back to the current unit
      if (unit === 'pixels') setHeight(String(hPx))
      else if (unit === 'cm') setHeight(String((hPx / dpi * 2.54).toFixed(2)))
      else if (unit === 'mm') setHeight(String((hPx / dpi * 25.4).toFixed(1)))
      else if (unit === 'inches') setHeight(String((hPx / dpi).toFixed(2)))
    }
  }

  const onHeightChange = (val) => {
    setHeight(val)
    if (locked && val && !isNaN(val)) {
      const hPx = toPixels(parseFloat(val), unit, dpi)
      const wPx = Math.round(hPx * aspectRatio)
      if (unit === 'pixels') setWidth(String(wPx))
      else if (unit === 'cm') setWidth(String((wPx / dpi * 2.54).toFixed(2)))
      else if (unit === 'mm') setWidth(String((wPx / dpi * 25.4).toFixed(1)))
      else if (unit === 'inches') setWidth(String((wPx / dpi).toFixed(2)))
    }
  }

  const applyPreset = (p) => {
    setUnit(p.unit)
    setWidth(String(p.w))
    setHeight(String(p.h))
  }

  const getPixelPreview = () => {
    const w = parseFloat(width)
    const h = parseFloat(height)
    if (!w || !h) return null
    return { w: toPixels(w, unit, dpi), h: toPixels(h, unit, dpi) }
  }

  const px = getPixelPreview()

  const handleResize = async () => {
    if (!file || !width || !height) return
    setLoading(true)
    setError(null)
    try {
      const res = await resizeImage({ file, width: parseFloat(width), height: parseFloat(height), unit, dpi, mode, format: outputFmt })
      setResult(res)
      onResult(res.blob)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <Maximize2 className="w-6 h-6 text-blue-600" /> Image Resizer
        </h2>

        {/* Presets */}
        <div className="mb-5">
          <label className="label">Quick Presets</label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Unit & DPI */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Unit</label>
            <select value={unit} onChange={e => setUnit(e.target.value)} className="input-field">
              <option value="pixels">Pixels</option>
              <option value="cm">Centimetres (cm)</option>
              <option value="mm">Millimetres (mm)</option>
              <option value="inches">Inches</option>
            </select>
          </div>
          <div>
            <label className="label">DPI / PPI</label>
            <select value={dpi} onChange={e => setDpi(Number(e.target.value))} className="input-field">
              {DPI_OPTIONS.map(d => <option key={d} value={d}>{d} DPI</option>)}
            </select>
          </div>
        </div>

        {/* Width / Height */}
        <div className="flex items-end gap-3 mb-4">
          <div className="flex-1">
            <label className="label">Width ({unit})</label>
            <input
              type="number"
              value={width}
              onChange={e => onWidthChange(e.target.value)}
              className="input-field"
              min="0.1"
              step={unit === 'pixels' ? 1 : 0.1}
            />
          </div>
          <button
            onClick={() => setLocked(l => !l)}
            className={`mb-1 p-2.5 rounded-xl border transition-colors ${locked ? 'border-purple-400 bg-purple-50 text-purple-600' : 'border-gray-200 text-gray-400 hover:border-purple-300'}`}
            title={locked ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
            aria-label={locked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
          >
            {locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
          <div className="flex-1">
            <label className="label">Height ({unit})</label>
            <input
              type="number"
              value={height}
              onChange={e => onHeightChange(e.target.value)}
              className="input-field"
              min="0.1"
              step={unit === 'pixels' ? 1 : 0.1}
            />
          </div>
        </div>

        {/* Pixel preview */}
        {px && unit !== 'pixels' && (
          <div className="mb-4 flex items-center gap-2 text-sm text-purple-700 bg-purple-50 px-3 py-2 rounded-lg">
            <Info className="w-4 h-4 flex-shrink-0" />
            = {px.w} × {px.h} pixels at {dpi} DPI
          </div>
        )}

        {/* Fitting mode */}
        <div className="mb-5">
          <label className="label">Fitting Mode</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'fit', label: 'Fit', desc: 'No cropping' },
              { id: 'fill', label: 'Fill', desc: 'Crop to fill' },
              { id: 'stretch', label: 'Stretch', desc: 'Distort to fit' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`px-3 py-2 rounded-xl border text-sm transition-all text-left ${
                  mode === m.id ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-purple-300'
                }`}
                title={m.desc}
              >
                <div className="font-medium">{m.label}</div>
                <div className="text-xs text-gray-400">{m.desc}</div>
              </button>
            ))}
          </div>
          {mode === 'stretch' && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Stretch may alter proportions — use with care.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="label">Output Format</label>
            <select value={outputFmt} onChange={e => setOutputFmt(e.target.value)} className="input-field">
              <option value="PNG">PNG</option>
              <option value="JPEG">JPEG</option>
              <option value="WEBP">WebP</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleResize}
          disabled={loading || !file}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <><div className="spinner !w-5 !h-5" /> Resizing…</> : <><Maximize2 className="w-5 h-5" /> Resize Image</>}
        </button>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}
      </div>

      {result && (
        <div className="card animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-900">Resized Successfully</div>
              <div className="text-sm text-gray-500 mt-1">
                {result.width} × {result.height} px · {formatBytes(result.blob.size)}
              </div>
            </div>
            <button
              onClick={() => {
                const ext = outputFmt === 'JPEG' ? 'jpg' : outputFmt.toLowerCase()
                downloadBlob(result.blob, `resized.${ext}`)
              }}
              className="btn-secondary btn-sm flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Download
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
