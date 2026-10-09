import { useState } from 'react'
import { Sparkles, Menu, X, Upload } from 'lucide-react'

export default function Header({ onUploadClick, backendOnline }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-purple-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent">
              PhotoStudio AI
            </span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#tools" className="hover:text-purple-700 transition-colors">Tools</a>
            <a href="#about" className="hover:text-purple-700 transition-colors">About</a>
            <a href="#privacy" className="hover:text-purple-700 transition-colors">Privacy</a>
            <a href="#contact" className="hover:text-purple-700 transition-colors">Contact</a>
          </nav>

          {/* Right section */}
          <div className="flex items-center gap-3">
            {/* Backend status */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium">
              <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className={backendOnline ? 'text-green-600' : 'text-red-500'}>
                {backendOnline ? 'Backend online' : 'Backend offline'}
              </span>
            </div>
            <button
              onClick={onUploadClick}
              className="btn-primary btn-sm flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload Image</span>
              <span className="sm:hidden">Upload</span>
            </button>
            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-2 text-sm font-medium text-gray-600">
          <a href="#tools" className="hover:text-purple-700 py-1" onClick={() => setMobileOpen(false)}>Tools</a>
          <a href="#about" className="hover:text-purple-700 py-1" onClick={() => setMobileOpen(false)}>About</a>
          <a href="#privacy" className="hover:text-purple-700 py-1" onClick={() => setMobileOpen(false)}>Privacy</a>
          <a href="#contact" className="hover:text-purple-700 py-1" onClick={() => setMobileOpen(false)}>Contact</a>
        </div>
      )}
    </header>
  )
}
