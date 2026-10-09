import { Sparkles, Maximize2, Minimize2, Crop, Palette, RefreshCw } from 'lucide-react'

const TOOLS = [
  {
    id: 'enhance',
    icon: Sparkles,
    title: 'AI Photo Enhancer',
    desc: 'Upscale, restore faces, reduce blur and noise with AI-powered enhancement.',
    gradient: 'from-purple-500 to-indigo-600',
  },
  {
    id: 'resize',
    icon: Maximize2,
    title: 'Image Resizer',
    desc: 'Resize to exact pixels, cm, mm, or inches with DPI control and aspect ratio lock.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'compress',
    icon: Minimize2,
    title: 'Image Compressor',
    desc: 'Reduce file size to a target KB/MB while preserving visual quality.',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'crop',
    icon: Crop,
    title: 'Crop & Shape Editor',
    desc: 'Crop, flip, rotate, and create circle crops with flexible aspect ratios.',
    gradient: 'from-orange-500 to-amber-500',
  },
  {
    id: 'filters',
    icon: Palette,
    title: 'Filters & Effects',
    desc: 'Apply 16 filter presets and fine-tune brightness, contrast, saturation, and more.',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    id: 'convert',
    icon: RefreshCw,
    title: 'Format Converter',
    desc: 'Convert between PNG, JPG, and WebP with transparency handling.',
    gradient: 'from-violet-500 to-purple-600',
  },
]

export default function ToolCards({ onToolSelect }) {
  return (
    <section id="tools" className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Professional Editing Tools</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Upload a photo once and use any combination of tools in one seamless workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOOLS.map((tool) => {
            const Icon = tool.icon
            return (
              <button
                key={tool.id}
                onClick={() => onToolSelect(tool.id)}
                className="card text-left group hover:shadow-lg hover:-translate-y-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{tool.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{tool.desc}</p>
                <div className="mt-4 text-sm font-medium text-purple-600 group-hover:text-purple-800 flex items-center gap-1">
                  Use tool →
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
