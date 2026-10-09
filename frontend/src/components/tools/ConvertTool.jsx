import { useState } from 'react'
import { RefreshCw, Download, AlertTriangle, Info } from 'lucide-react'
import { convertImage, downloadBlob, formatBytes } from '../../services/api'

const CONVERSIONS = [
  { from: 'PNG',  to: 'JPEG', label: 'PNG → JPEG' },
  { from: 'PNG',  to: 'WEBP', label: 'PNG → WebP' },
  { from: 'JPEG', to: 'PNG',  label: 'JPEG → PNG' },
  { from: 'JPEG', to: 'WEBP', label: 'JPEG → WebP' },
  { from: 'WEBP', to: 'PNG',  label: 'WebP → PNG' },
  { from: 'WEBP', to: 'JPEG', label: 'WebP → JPEG' },
]

export default function ConvertTool({ file, imageInfo, onResult }) {
  const [targetFmt, setTargetFmt] = useState('JPEG')
  const [quality, setQuality]     = useState(92)
  const [bgColor, setBgColor]     = useState('#ffffff')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [result, setResult]       = useState(null)

  const needsBg = targetFmt === 'JPEG' && imageInfo?.hasAlpha

  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return { r, g, b }
  }

  const handleConvert = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    const { r, g, b } = hexToRgb(bgColor)
    try {
      const res = await convertImage({ file, targetFormat: targetFmt, bgR: r, bgG: g, bgB: b, quality })
      setResult(res)
      onResult(res.blob)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const currentFmt = (imageInfo?.format || 'UNKNOWN').toUpperCase()

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <RefreshCw className="w-6 h-6 text-violet-600" /> Format Converter
        </h2>

        {imageInfo && (
          <div className="mb-5 flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-xl text-sm">
            <div>
              <span className="font-medium text-gray-700">Current format:</span>{' '}
              <span className="font-bold text-violet-600">{currentFmt}</span>
            </div>
            <span className="text-gray-300">·</span>
            <div>{formatBytes(file?.size || 0)}</div>
          </div>
        )}

        {/* Conversion grid */}
        <div className="mb-5">
          <label className="label">Quick conversion</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CONVERSIONS.map(c => (
              <button
                key={c.label}
                onClick={() => setTargetFmt(c.to)}
                className={`px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                  targetFmt === c.to
                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                    : 'border-gray-200 hover:border-violet-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Target Format</label>
            <select value={targetFmt} onChange={e => setTargetFmt(e.target.value)} className="input-field">
              <option value="JPEG">JPEG</option>
              <option value="PNG">PNG</option>
              <option value="WEBP">WebP</option>
            </select>
          </div>
          {targetFmt !== 'PNG' && (
            <div>
              <label className="label flex justify-between">
                Quality <span className="text-violet-600 font-semibold">{quality}%</span>
              </label>
              <input type="range" min={10} max={100} value={quality} onChange={e => setQuality(Number(e.target.value))} />
            </div>
          )}
        </div>

        {/* Background color for JPEG */}
        {targetFmt === 'JPEG' && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                JPEG cannot store transparency. Transparent areas will be filled with the background color.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Background color:</label>
              <input
                type="color"
                value={bgColor}
                onChange={e => setBgColor(e.target.value)}
                className="w-10 h-8 rounded border border-gray-200 cursor-pointer"
              />
              <span className="text-sm text-gray-500 uppercase">{bgColor}</span>
            </div>
          </div>
        )}

        <div className="mb-5 flex items-start gap-2 text-sm text-gray-500 bg-blue-50 px-3 py-2 rounded-xl border border-blue-100">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <span>
            <strong>PNG</strong> is lossless and supports transparency.{' '}
            <strong>JPEG</strong> is smaller but lossy and no transparency.{' '}
            <strong>WebP</strong> combines both.
          </span>
        </div>

        <button
          onClick={handleConvert}
          disabled={loading || !file}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <><div className="spinner !w-5 !h-5" /> Converting…</> : <><RefreshCw className="w-5 h-5" /> Convert Image</>}
        </button>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}
      </div>

      {result && (
        <div className="card animate-fade-in">
          <h3 className="font-bold text-gray-900 mb-3">Conversion Result</h3>
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{result.originalFormat}</span>
                {' → '}
                <span className="font-medium text-violet-700">{result.outputFormat}</span>
              </div>
              <div className="text-sm text-gray-500">
                {formatBytes(file?.size || 0)} → {formatBytes(result.convertedSize)}
              </div>
              {result.hadTransparency && targetFmt === 'JPEG' && (
                <div className="text-xs text-amber-600">Transparency was replaced with background color.</div>
              )}
            </div>
            <button
              onClick={() => {
                const ext = targetFmt === 'JPEG' ? 'jpg' : targetFmt.toLowerCase()
                downloadBlob(result.blob, `converted.${ext}`)
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
