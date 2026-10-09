import { Sparkles, Github } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent">
                PhotoStudio AI
              </span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              A professional AI photo enhancer and image editing studio. Enhance, resize, compress,
              crop, filter, and convert your images without creating an account.
            </p>
          </div>

          {/* Links */}
          <div id="about">
            <h4 className="font-semibold text-gray-800 mb-3">About</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#tools" className="hover:text-purple-600 transition-colors">Tools</a></li>
              <li>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer"
                  className="hover:text-purple-600 transition-colors flex items-center gap-1">
                  <Github className="w-3.5 h-3.5" /> Source Code
                </a>
              </li>
            </ul>
          </div>

          <div id="contact">
            <h4 className="font-semibold text-gray-800 mb-3" id="privacy">Legal & Contact</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>
                <a href="#privacy-policy" className="hover:text-purple-600 transition-colors">Privacy Policy</a>
              </li>
              <li>
                <a href="mailto:contact@photostudio.ai" className="hover:text-purple-600 transition-colors">
                  contact@photostudio.ai
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-400">
          <p>© {new Date().getFullYear()} PhotoStudio AI. No images are stored or logged.</p>
          <p>Built with React · Flask · Pillow · OpenCV</p>
        </div>

        {/* Privacy policy anchor */}
        <div id="privacy-policy" className="mt-8 p-4 bg-gray-50 rounded-xl text-xs text-gray-500 leading-relaxed">
          <strong className="text-gray-700">Privacy Policy:</strong> PhotoStudio AI processes all images
          in-memory on the server and does not store, log, or share any image data. Temporary files created
          during processing are deleted within 5 minutes. No user accounts, cookies, or tracking are used.
        </div>
      </div>
    </footer>
  )
}
