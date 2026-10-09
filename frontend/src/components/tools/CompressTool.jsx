import { useState } from 'react'
import { Minimize2, Download, AlertTriangle } from 'lucide-react'
import { compressImage, downloadBlob, formatBytes } from '../../services/api'

const SIZE_PRESETS = [
  { label: '20 KB',  kb: 20 },
  { label: '50 KB',  kb: 50 },
  { label: '100 KB', kb: 100 },
  { label: '200 KB', kb: 200 },
  { label: '500 KB', kb: 500 },
  { label: '1 MB',   mb: 1 },
]

export default function CompressTool({ file, imageInfo, onResult }) {
  const [mode, setMode]           = useState('quality')  // 'quality' | 'target'
  const [quality, setQuality]     = useState(80)
  const [targetKb, setTargetKb]   = useState('')
  const [targetMb, setTargetMb]   = useState('')
  const [targetUnit, setTargetUnit] = useState('kb')
  const [format, setFormat]       = useState('JPEG')
  const [allowResize, setAllowResize] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [result, setResult]       = useState(null)

  const handleCompress = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const params = {
        file,
        format,
        allowResize,
        quality: mode === 'quality' ? quality : undefined,
        targetKb: mode === 'target' && targetUnit === 'kb' ? parseFloat(targetKb) : undefined,
        targetMb: mode === 'target' && targetUnit === 'mb' ? parseFloat(targetMb) : undefined,
      }
      const res = await compressImage(params)
      setResult(res)
      onResult(res.blob)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const applyPreset = (p) => {
    setMode('target')
    if (p.kb) { setTargetUnit('kb'); setTargetKb(String(p.kb)); setTargetMb('') }
    else       { setTargetUnit('mb'); setTargetMb(String(p.mb)); setTargetKb('') }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <Minimize2 className="w-6 h-6 text-emerald-600" /> Image Compressor
        </h2>
        {imageInfo && (
          <div className="mb-4 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
            Original: {imageInfo.width} × {imageInfo.height} px · {formatBytes(file?.size || 0)}
          </div>
        )}

        {/* Mode toggle */}
        <div className="flex gap-2 mb-5">
          {[
            { id: 'quality', label: 'Quality Slider' },
            { id: 'target',  label: 'Target Size' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${
                mode === m.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-emerald-300'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'quality' ? (
          <div className="mb-5">
            <label className="label flex items-center justify-between">
              Quality <span className="text-purple-600 font-semibold">{quality}%</span>
            </label>
            <input
              type="range"
              min={10}
              max={100}
              value={quality}
              onChange={e => setQuality(Number(e.target.value))}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Smaller file</span>
              <span>Higher quality</span>
            </div>
          </div>
        ) : (
          <div className="mb-5">
            <div className="mb-3">
              <label className="label">Quick Presets</label>
              <div className="flex flex-wrap gap-2">
                {SIZE_PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="label">Target size</label>
                <input
                  type="number"
                  value={targetUnit === 'kb' ? targetKb : targetMb}
                  onChange={e => {
                    if (targetUnit === 'kb') setTargetKb(e.target.value)
                    else setTargetMb(e.target.value)
                  }}
                  className="input-field"
                  min="1"
                  placeholder={`e.g. ${targetUnit === 'kb' ? '100' : '1'}`}
                />
              </div>
              <div>
                <label className="label">Unit</label>
                <select
                  value={targetUnit}
                  onChange={e => setTargetUnit(e.target.value)}
                  className="input-field"
                >
                  <option value="kb">KB</option>
                  <option value="mb">MB</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Output Format</label>
            <select value={format} onChange={e => setFormat(e.target.value)} className="input-field">
              <option value="JPEG">JPEG (best compression)</option>
              <option value="WEBP">WebP (modern)</option>
              <option value="PNG">PNG (lossless)</option>
            </select>
            {format === 'PNG' && (
              <p className="text-xs text-amber-600 mt-1 flex items-start gap-1">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                PNG is lossless; target size may not be achievable.
              </p>
            )}
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input
                type="checkbox"
                checked={allowResize}
                onChange={e => setAllowResize(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600"
              />
              Allow dimension resize
            </label>
          </div>
        </div>

        <button
          onClick={handleCompress}
          disabled={loading || !file}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <><div className="spinner !w-5 !h-5" /> Compressing…</> : <><Minimize2 className="w-5 h-5" /> Compress Image</>}
        </button>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}
      </div>

      {result && (
        <div className="card animate-fade-in">
          <h3 className="font-bold text-gray-900 mb-3">Compression Result</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Original',    value: formatBytes(result.originalSize) },
              { label: 'Compressed',  value: formatBytes(result.compressedSize) },
              { label: 'Reduction',   value: `${result.reductionPct}%` },
            ].map(({ label, value }) => (
              <div key={label} className="text-center bg-gray-50 rounded-xl p-3">
                <div className="text-lg font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
          {result.warning && (
            <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {result.warning}
            </div>
          )}
          <button
            onClick={() => {
              const ext = format === 'JPEG' ? 'jpg' : format.toLowerCase()
              downloadBlob(result.blob, `compressed.${ext}`)
            }}
            className="btn-secondary w-full flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" /> Download Compressed Image
          </button>
        </div>
      )}
    </div>
  )
}
