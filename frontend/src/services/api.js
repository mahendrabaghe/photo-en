/**
 * API service — all calls to the Flask backend.
 * Base URL is determined by VITE_API_URL env var (set in .env or Render).
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // 2 min for AI processing
})

// Expose response headers we care about
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err.response?.data?.error ||
      err.message ||
      'An unexpected error occurred.'
    return Promise.reject(new Error(msg))
  },
)

/**
 * Check backend health.
 * Returns { status, ai_enhancement, max_upload_mb }
 */
export async function checkHealth() {
  const res = await api.get('/api/health')
  return res.data
}

/**
 * Enhance an image with AI / conventional upscaling.
 */
export async function enhanceImage({ file, scale = 2, preset = 'natural', format = 'PNG' }, onProgress) {
  const form = new FormData()
  form.append('image', file)
  form.append('scale', scale)
  form.append('preset', preset)
  form.append('format', format)

  const res = await api.post('/api/enhance', form, {
    responseType: 'blob',
    onUploadProgress: onProgress,
  })
  return {
    blob: res.data,
    aiUsed: res.headers['x-ai-available'] === 'true',
    width: parseInt(res.headers['x-output-width'] || '0'),
    height: parseInt(res.headers['x-output-height'] || '0'),
  }
}

/**
 * Resize an image.
 */
export async function resizeImage({ file, width, height, unit = 'pixels', dpi = 96, mode = 'fit', format = 'PNG' }, onProgress) {
  const form = new FormData()
  form.append('image', file)
  form.append('width', width)
  form.append('height', height)
  form.append('unit', unit)
  form.append('dpi', dpi)
  form.append('mode', mode)
  form.append('format', format)

  const res = await api.post('/api/resize', form, {
    responseType: 'blob',
    onUploadProgress: onProgress,
  })
  return {
    blob: res.data,
    width: parseInt(res.headers['x-output-width'] || '0'),
    height: parseInt(res.headers['x-output-height'] || '0'),
  }
}

/**
 * Compress an image to a target size.
 */
export async function compressImage({ file, targetKb, targetMb, quality, format = 'JPEG', allowResize = false, maxDimension }, onProgress) {
  const form = new FormData()
  form.append('image', file)
  form.append('format', format)
  form.append('allow_resize', allowResize ? 'true' : 'false')
  if (targetKb != null) form.append('target_kb', targetKb)
  if (targetMb != null) form.append('target_mb', targetMb)
  if (quality != null) form.append('quality', quality)
  if (maxDimension != null) form.append('max_dimension', maxDimension)

  const res = await api.post('/api/compress', form, {
    responseType: 'blob',
    onUploadProgress: onProgress,
  })
  return {
    blob: res.data,
    originalSize: parseInt(res.headers['x-original-size'] || '0'),
    compressedSize: parseInt(res.headers['x-compressed-size'] || '0'),
    reductionPct: parseFloat(res.headers['x-reduction-pct'] || '0'),
    qualityUsed: parseInt(res.headers['x-quality-used'] || '0'),
    warning: res.headers['x-target-warning'] || null,
  }
}

/**
 * Crop / flip / rotate an image.
 */
export async function cropImage({ file, operation = 'crop', x, y, w, h, aspectW, aspectH, direction, degrees, format = 'PNG' }, onProgress) {
  const form = new FormData()
  form.append('image', file)
  form.append('operation', operation)
  form.append('format', format)
  if (x != null) form.append('x', x)
  if (y != null) form.append('y', y)
  if (w != null) form.append('w', w)
  if (h != null) form.append('h', h)
  if (aspectW != null) form.append('aspect_w', aspectW)
  if (aspectH != null) form.append('aspect_h', aspectH)
  if (direction != null) form.append('direction', direction)
  if (degrees != null) form.append('degrees', degrees)

  const res = await api.post('/api/crop', form, {
    responseType: 'blob',
    onUploadProgress: onProgress,
  })
  return {
    blob: res.data,
    width: parseInt(res.headers['x-output-width'] || '0'),
    height: parseInt(res.headers['x-output-height'] || '0'),
  }
}

/**
 * Apply filters and adjustments.
 */
export async function applyFilters({ file, preset, brightness, contrast, saturation, sharpness, warmth, blur, highlights, shadows, vignette, format = 'JPEG' }, onProgress) {
  const form = new FormData()
  form.append('image', file)
  form.append('format', format)
  if (preset) form.append('preset', preset)
  if (brightness != null) form.append('brightness', brightness)
  if (contrast   != null) form.append('contrast',   contrast)
  if (saturation != null) form.append('saturation', saturation)
  if (sharpness  != null) form.append('sharpness',  sharpness)
  if (warmth     != null) form.append('warmth',     warmth)
  if (blur       != null) form.append('blur',       blur)
  if (highlights != null) form.append('highlights', highlights)
  if (shadows    != null) form.append('shadows',    shadows)
  if (vignette   != null) form.append('vignette',   vignette)

  const res = await api.post('/api/filters', form, {
    responseType: 'blob',
    onUploadProgress: onProgress,
  })
  return { blob: res.data }
}

/**
 * Convert image format.
 */
export async function convertImage({ file, targetFormat, bgR = 255, bgG = 255, bgB = 255, quality = 92 }, onProgress) {
  const form = new FormData()
  form.append('image', file)
  form.append('target_format', targetFormat)
  form.append('bg_r', bgR)
  form.append('bg_g', bgG)
  form.append('bg_b', bgB)
  form.append('quality', quality)

  const res = await api.post('/api/convert', form, {
    responseType: 'blob',
    onUploadProgress: onProgress,
  })
  return {
    blob: res.data,
    originalFormat: res.headers['x-original-format'] || '',
    outputFormat: res.headers['x-output-format'] || targetFormat,
    convertedSize: parseInt(res.headers['x-converted-size'] || '0'),
    hadTransparency: res.headers['x-had-transparency'] === 'true',
  }
}

/**
 * Download a Blob as a named file.
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Convert a Blob to a data URL (for preview).
 */
export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
