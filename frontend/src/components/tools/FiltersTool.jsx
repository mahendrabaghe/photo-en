import { useState, useEffect, useRef } from 'react'
import { Palette, Download, RotateCcw, Undo2, Redo2 } from 'lucide-react'
import { applyFilters, downloadBlob, formatBytes } from '../../services/api'

const FILTER_PRESETS = [
  { id: 'original',       label: 'Original',        emoji: '🖼️' },
  { id: 'natural',        label: 'Natural',          emoji: '🌿' },
  { id: 'portrait',       label: 'Portrait',         emoji: '👤' },
  { id: 'vintage',        label: 'Vintage',          emoji: '📷' },
  { id: 'bw',             label: 'B&W',              emoji: '⬛' },
  { id: 'sepia',          label: 'Sepia',            emoji: '🟫' },
  { id: 'warm',           label: 'Warm',             emoji: '🌅' },
  { id: 'cool',           label: 'Cool',             emoji: '❄️' },
  { id: 'cinematic',      label: 'Cinematic',        emoji: '🎬' },
  { id: 'hdr',            label: 'HDR',              emoji: '✨' },
  { id: 'vivid',          label: 'Vivid',            emoji: '🌈' },
  { id: 'soft_glow',      label: 'Soft Glow',        emoji: '💫' },
  { id: 'sharpen',        label: 'Sharpen',          emoji: '🔍' },
  { id: 'grayscale',      label: 'Grayscale',        emoji: '🩶' },
  { id: 'brighten',       label: 'Brighten',         emoji: '☀️' },
  { id: 'contrast_boost', label: 'Contrast Boost',   emoji: '🎭' },
]

const SLIDERS = [
  { key: 'brightness', label: 'Brightness', min: 0, max: 2,   step: 0.05, default: 1.0, center: 1.0 },
  { key: 'contrast',   label: 'Contrast',   min: 0, max: 2,   step: 0.05, default: 1.0, center: 1.0 },
  { key: 'saturation', label: 'Saturation', min: 0, max: 2,   step: 0.05, default: 1.0, center: 1.0 },
  { key: 'sharpness',  label: 'Sharpness',  min: 0, max: 3,   step: 0.1,  default: 1.0, center: 1.0 },
  { key: 'warmth',     label: 'Warmth',     min: -1, max: 1,  step: 0.05, default: 0.0, center: 0.0 },
  { key: 'highlights', label: 'Highlights', min: -1, max: 1,  step: 0.05, default: 0.0, center: 0.0 },
  { key: 'shadows',    label: 'Shadows',    min: -1, max: 1,  step: 0.05, default: 0.0, center: 0.0 },
  { key: 'blur',       label: 'Blur',       min: 0, max: 10,  step: 0.5,  default: 0.0, center: 0.0 },
  { key: 'vignette',   label: 'Vignette',   min: 0, max: 1,   step: 0.05, default: 0.0, center: 0.0 },
]

const DEFAULT_ADJUSTMENTS = Object.fromEntries(SLIDERS.map(s => [s.key, s.default]))

export default function FiltersTool({ file, onResult }) {
  const [preset, setPreset]       = useState('original')
  const [adj, setAdj]             = useState({ ...DEFAULT_ADJUSTMENTS })
  const [format, setFormat]       = useState('JPEG')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [result, setResult]       = useState(null)
  const [history, setHistory]     = useState([])
  const [future, setFuture]       = useState([])

  const pushHistory = (prevAdj, prevPreset) => {
    setHistory(h => [...h, { adj: prevAdj, preset: prevPreset }])
    setFuture([])
  }

  const undo = () => {
    if (!history.length) return
    const prev = history[history.length - 1]
    setFuture(f => [{ adj, preset }, ...f])
    setAdj(prev.adj)
    setPreset(prev.preset)
    setHistory(h => h.slice(0, -1))
  }

  const redo = () => {
    if (!future.length) return
    const next = future[0]
    setHistory(h => [...h, { adj, preset }])
    setAdj(next.adj)
    setPreset(next.preset)
    setFuture(f => f.slice(1))
  }

  const onSliderChange = (key, value) => {
    pushHistory(adj, preset)
    setAdj(prev => ({ ...prev, [key]: value }))
  }

  const onPresetSelect = (id) => {
    pushHistory(adj, preset)
    setPreset(id)
  }

  const resetAll = () => {
    pushHistory(adj, preset)
    setAdj({ ...DEFAULT_ADJUSTMENTS })
    setPreset('original')
  }

  const handleApply = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const params = {
        file,
        format,
        preset: preset !== 'original' ? preset : undefined,
        ...adj,
      }
      const res = await applyFilters(params)
      setResult(res)
      onResult(res.blob)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isDefault = (key) => adj[key] === DEFAULT_ADJUSTMENTS[key]

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="section-title flex items-center gap-2 mb-0">
            <Palette className="w-6 h-6 text-pink-500" /> Filters & Effects
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={undo} disabled={!history.length} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40" title="Undo">
              <Undo2 className="w-4 h-4" />
            </button>
            <button onClick={redo} disabled={!future.length} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40" title="Redo">
              <Redo2 className="w-4 h-4" />
            </button>
            <button onClick={resetAll} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Reset all">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter grid */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-6">
          {FILTER_PRESETS.map(f => (
            <button
              key={f.id}
              onClick={() => onPresetSelect(f.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs transition-all ${
                preset === f.id
                  ? 'border-pink-500 bg-pink-50 text-pink-700 font-semibold'
                  : 'border-gray-200 hover:border-pink-300 text-gray-600'
              }`}
            >
              <span className="text-xl">{f.emoji}</span>
              <span className="leading-tight text-center">{f.label}</span>
            </button>
          ))}
        </div>

        {/* Adjustment sliders */}
        <div className="space-y-4 mb-5">
          {SLIDERS.map(s => (
            <div key={s.key}>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">{s.label}</label>
                <span className={`text-sm font-semibold ${!isDefault(s.key) ? 'text-pink-600' : 'text-gray-400'}`}>
                  {adj[s.key].toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={adj[s.key]}
                onChange={e => onSliderChange(s.key, parseFloat(e.target.value))}
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="label">Output Format</label>
            <select value={format} onChange={e => setFormat(e.target.value)} className="input-field">
              <option value="JPEG">JPEG</option>
              <option value="PNG">PNG</option>
              <option value="WEBP">WebP</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleApply}
          disabled={loading || !file}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <><div className="spinner !w-5 !h-5" /> Applying…</> : <><Palette className="w-5 h-5" /> Apply Filters</>}
        </button>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}
      </div>

      {result && (
        <div className="card animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-900">Filters Applied</div>
              <div className="text-sm text-gray-500 mt-1">{formatBytes(result.blob.size)}</div>
            </div>
            <button
              onClick={() => {
                const ext = format === 'JPEG' ? 'jpg' : format.toLowerCase()
                downloadBlob(result.blob, `filtered.${ext}`)
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
