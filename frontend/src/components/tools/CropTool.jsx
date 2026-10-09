import { useState, useRef, useEffect, useCallback } from 'react'
import { Crop, Download, RotateCcw, FlipHorizontal, FlipVertical } from 'lucide-react'
import { cropImage, downloadBlob, formatBytes } from '../../services/api'

const ASPECT_PRESETS = [
  { label: 'Free',      aw: null, ah: null },
  { label: '1:1',       aw: 1,   ah: 1 },
  { label: '3:4',       aw: 3,   ah: 4 },
  { label: '4:3',       aw: 4,   ah: 3 },
  { label: '16:9',      aw: 16,  ah: 9 },
  { label: 'Circle',    aw: 1,   ah: 1,  circle: true },
]

export default function CropTool({ file, imageInfo, onResult }) {
  const [selectedPreset, setSelectedPreset] = useState(ASPECT_PRESETS[0])
  const [format, setFormat]   = useState('PNG')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [result, setResult]   = useState(null)

  // Interactive crop
  const canvasRef   = useRef(null)
  const imageRef    = useRef(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, w: 100, h: 100 })
  const dragging = useRef(null)
  const dragStart = useRef({})

  const [previewURL, setPreviewURL] = useState(null)
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewURL(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [file])

  const initCropBox = useCallback(() => {
    if (!canvasRef.current || !imageRef.current) return
    const img = imageRef.current
    const c = canvasRef.current
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const pct = 0.8
    const x = img.naturalWidth * (1 - pct) / 2
    const y = img.naturalHeight * (1 - pct) / 2
    const w = img.naturalWidth * pct
    const h = selectedPreset.aw
      ? Math.min(w / selectedPreset.aw * selectedPreset.ah, img.naturalHeight * pct)
      : img.naturalHeight * pct
    setCropBox({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) })
  }, [selectedPreset])

  useEffect(() => {
    if (imgLoaded) initCropBox()
  }, [imgLoaded, initCropBox])

  const handleCrop = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      let res
      if (selectedPreset.circle) {
        res = await cropImage({ file, operation: 'circle', format: 'PNG' })
      } else if (selectedPreset.aw != null) {
        res = await cropImage({ file, operation: 'aspect', aspectW: selectedPreset.aw, aspectH: selectedPreset.ah, format })
      } else {
        res = await cropImage({ file, operation: 'crop', x: cropBox.x, y: cropBox.y, w: cropBox.w, h: cropBox.h, format })
      }
      setResult(res)
      onResult(res.blob)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFlip = async (direction) => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const res = await cropImage({ file, operation: 'flip', direction, format })
      setResult(res)
      onResult(res.blob)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleRotate = async (deg) => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const res = await cropImage({ file, operation: 'rotate', degrees: deg, format })
      setResult(res)
      onResult(res.blob)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <Crop className="w-6 h-6 text-orange-500" /> Crop & Shape Editor
        </h2>

        {/* Aspect presets */}
        <div className="mb-5">
          <label className="label">Crop Shape / Aspect Ratio</label>
          <div className="flex flex-wrap gap-2">
            {ASPECT_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => setSelectedPreset(p)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${
                  selectedPreset.label === p.label
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Flip & Rotate */}
        <div className="mb-5">
          <label className="label">Transform</label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleFlip('horizontal')} className="btn-secondary btn-sm flex items-center gap-1.5">
              <FlipHorizontal className="w-4 h-4" /> Flip H
            </button>
            <button onClick={() => handleFlip('vertical')} className="btn-secondary btn-sm flex items-center gap-1.5">
              <FlipVertical className="w-4 h-4" /> Flip V
            </button>
            {[90, 180, 270].map(deg => (
              <button key={deg} onClick={() => handleRotate(deg)} className="btn-secondary btn-sm flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4" /> {deg}°
              </button>
            ))}
          </div>
        </div>

        {/* Freeform crop preview */}
        {selectedPreset.label === 'Free' && previewURL && imageInfo && (
          <div className="mb-5">
            <label className="label">Crop Coordinates (pixels)</label>
            <div className="grid grid-cols-2 gap-3">
              {['x', 'y', 'w', 'h'].map(k => (
                <div key={k}>
                  <label className="label text-xs">{k === 'x' ? 'Left (x)' : k === 'y' ? 'Top (y)' : k === 'w' ? 'Width' : 'Height'}</label>
                  <input
                    type="number"
                    value={cropBox[k]}
                    min={0}
                    max={k === 'w' ? imageInfo.width : k === 'h' ? imageInfo.height : k === 'x' ? imageInfo.width : imageInfo.height}
                    onChange={e => setCropBox(prev => ({ ...prev, [k]: Number(e.target.value) }))}
                    className="input-field"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image preview (hidden, used for dimensions) */}
        {previewURL && (
          <img
            ref={imageRef}
            src={previewURL}
            alt="Source"
            onLoad={() => setImgLoaded(true)}
            className="hidden"
          />
        )}

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="label">Output Format</label>
            <select value={format} onChange={e => setFormat(e.target.value)} className="input-field">
              <option value="PNG">PNG</option>
              <option value="JPEG">JPEG</option>
              <option value="WEBP">WebP</option>
            </select>
            {selectedPreset.circle && format !== 'PNG' && (
              <p className="text-xs text-amber-600 mt-1">Circle crop uses PNG to preserve transparency.</p>
            )}
          </div>
        </div>

        <button
          onClick={handleCrop}
          disabled={loading || !file}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <><div className="spinner !w-5 !h-5" /> Processing…</> : <><Crop className="w-5 h-5" /> Apply Crop</>}
        </button>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}
      </div>

      {result && (
        <div className="card animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-900">Done!</div>
              <div className="text-sm text-gray-500 mt-1">
                {result.width} × {result.height} px · {formatBytes(result.blob.size)}
              </div>
            </div>
            <button
              onClick={() => {
                const ext = (selectedPreset.circle ? 'png' : format === 'JPEG' ? 'jpg' : format.toLowerCase())
                downloadBlob(result.blob, `cropped.${ext}`)
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
