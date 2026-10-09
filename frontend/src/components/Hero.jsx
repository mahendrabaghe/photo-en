import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, ImageIcon, Sparkles, Zap, Shield } from 'lucide-react'

export default function Hero({ onImageUpload }) {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onImageUpload(acceptedFiles[0])
    }
  }, [onImageUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png':  ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
    onDropRejected: (rejections) => {
      const reason = rejections[0]?.errors[0]?.message || 'File rejected'
      alert(reason)
    },
  })

  return (
    <section className="relative overflow-hidden py-20 px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-200 rounded-full opacity-30 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-indigo-200 rounded-full opacity-30 blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <Sparkles className="w-4 h-4" />
          AI-Powered Photo Enhancement
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-4 leading-tight">
          Make Every Photo<br />
          <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Look Amazing
          </span>
        </h1>

        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Enhance, resize, compress, and transform your photos in one place.
          No sign-up required.
        </p>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-3xl p-12 cursor-pointer transition-all duration-200 max-w-2xl mx-auto
            ${isDragActive
              ? 'border-purple-500 bg-purple-50 scale-[1.02]'
              : 'border-purple-200 bg-white/70 hover:border-purple-400 hover:bg-purple-50/50'
            }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-colors ${
              isDragActive ? 'bg-purple-600' : 'bg-gradient-to-br from-purple-500 to-indigo-600'
            }`}>
              {isDragActive ? (
                <ImageIcon className="w-10 h-10 text-white" />
              ) : (
                <Upload className="w-10 h-10 text-white" />
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-800 mb-1">
                {isDragActive ? 'Drop your image here' : 'Drag & drop your image here'}
              </p>
              <p className="text-gray-500 text-sm">
                or <span className="text-purple-600 font-medium underline">click to browse</span>
              </p>
            </div>
            <p className="text-xs text-gray-400">
              Supports JPG, JPEG, PNG, WebP · Max 20 MB
            </p>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-6 mt-12 max-w-2xl mx-auto">
          {[
            { icon: Sparkles, label: 'AI Enhancement', desc: 'Real upscaling & restoration' },
            { icon: Zap,      label: 'Lightning Fast',  desc: 'Processed in seconds' },
            { icon: Shield,   label: 'Private & Safe',  desc: 'No data stored, ever' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Icon className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm font-semibold text-gray-800">{label}</span>
              <span className="text-xs text-gray-500 text-center">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
