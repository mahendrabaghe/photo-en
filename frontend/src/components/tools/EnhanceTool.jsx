import { useState, useRef, useEffect } from 'react'
import { Sparkles, Download, Info, ChevronDown } from 'lucide-react'
import { enhanceImage, downloadBlob, blobToDataURL, formatBytes } from '../../services/api'

const PRESETS = [
  { id: 'face_enhance',  label: 'Face Enhance',      desc: 'Boost facial detail and skin texture' },
  { id: 'old_photo',     label: 'Old Photo Restore',  desc: 'Restore aged or damaged photos' },
  { id: 'blur_reduction',label: 'Blur Reduction',     desc: 'Sharpen blurry or out-of-focus images' },
  { id: 'hd_upscale',    label: 'HD Upscale',         desc: 'Increase resolution with detail recovery' },
  { id: 'natural',       label: 'Natural Enhancement',desc: 'Subtle all-around improvement' },
  { id: 'color',         label: 'Color Enhancement',  desc: 'Vivid and balanced color correction' },
]

export default function EnhanceTool({ file, onResult }) {
  const [preset, setPreset]           = useState('natural')
  const [scale, setScale]             = useState(2)
  const [outputFmt, setOutputFmt]     = useState('PNG')
  const [loading, setLoading]         = useState(false)
  const [progress, setProgress]       = useState(0)
  const [error, setError]             = useState(null)
  const [result, setResult]           = useState(null)  // { blob, aiUsed, width, height }
  const [sliderPos, setSliderPos]     = useState(50)
  const [originalURL, setOriginalURL] = useState(null)
  const [enhancedURL, setEnhancedURL] = useState(null)
  const containerRef = useRef(null)
  const dragging = useRef(false)

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setOriginalURL(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [file])

  useEffect(() => {
    if (result?.blob) {
      const url = URL.createObjectURL(result.blob)
      setEnhancedURL(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [result])

  const handleEnhance = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setProgress(0)
    setResult(null)
    try {
      const res = await enhanceImage(
        { file, scale, preset, format: outputFmt },
        (e) => { if (e.total) setProgress(Math.round((e.loaded / e.total) * 40)) }
      )
      setProgress(100)
      setResult(res)
      onResult(res.blob)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Comparison slider handlers
  const onMouseMove = (e) => {
    if (!dragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    setSliderPos((x / rect.width) * 100)
  }
  const onTouchMove = (e) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width))
    setSliderPos((x / rect.width) * 100)
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-600" /> AI Photo Enhancer
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Uses a real enhancement pipeline (AI when available, high-quality conventional otherwise) to upscale
          and restore your photo.
        </p>

        {/* Presets */}
        <div className="mb-5">
          <label className="label">Enhancement Preset</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all
                  ${preset === p.id
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-purple-300 text-gray-700'
                  }`}
                title={p.desc}
              >
                <div className="font-medium">{p.label}</div>
                <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Scale & format */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="label">Upscale Factor</label>
            <div className="flex gap-2">
              {[2, 4].map(s => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all
                    ${scale === s ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-purple-300'}`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Output Format</label>
            <select
              value={outputFmt}
              onChange={e => setOutputFmt(e.target.value)}
              className="input-field"
            >
              <option value="PNG">PNG</option>
              <option value="JPEG">JPEG</option>
              <option value="WEBP">WebP</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleEnhance}
          disabled={loading || !file}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="spinner !w-5 !h-5" />
              Enhancing… {progress > 0 ? `${progress}%` : ''}
            </>
          ) : (
            <><Sparkles className="w-5 h-5" /> Enhance Image</>
          )}
        </button>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Before/After comparison */}
      {result && originalURL && enhancedURL && (
        <div className="card animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Before / After Comparison</h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Info className="w-3.5 h-3.5" />
              {result.aiUsed ? (
                <span className="text-purple-600 font-medium">AI Enhanced ✨</span>
              ) : (
                <span>Conventional enhancement (AI model not available)</span>
              )}
            </div>
          </div>

          <div
            ref={containerRef}
            className="comparison-container rounded-xl overflow-hidden select-none cursor-ew-resize"
            style={{ maxHeight: '500px' }}
            onMouseMove={onMouseMove}
            onMouseDown={() => { dragging.current = true }}
            onMouseUp={() => { dragging.current = false }}
            onMouseLeave={() => { dragging.current = false }}
            onTouchMove={onTouchMove}
            role="img"
            aria-label="Before and after comparison"
          >
            <img
              src={originalURL}
              alt="Original"
              className="w-full object-contain"
              draggable={false}
            />
            <div
              className="comparison-after"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src={enhancedURL}
                alt="Enhanced"
                className="object-contain"
                style={{ width: containerRef.current?.offsetWidth || '100%' }}
                draggable={false}
              />
            </div>
            <div
              className="comparison-handle"
              style={{ left: `${sliderPos}%` }}
            />
            {/* Labels */}
            <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full pointer-events-none">
              After
            </div>
            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full pointer-events-none">
              Before
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Output: {result.width} × {result.height} px · {formatBytes(result.blob.size)}
            </div>
            <button
              onClick={() => {
                const ext = outputFmt === 'JPEG' ? 'jpg' : outputFmt.toLowerCase()
                downloadBlob(result.blob, `enhanced.${ext}`)
              }}
              className="btn-secondary btn-sm flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Download Enhanced
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
