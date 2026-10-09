import { useState, useEffect, useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

import Header       from './components/Header'
import Hero         from './components/Hero'
import ToolCards    from './components/ToolCards'
import ImageWorkspace from './components/ImageWorkspace'
import Footer       from './components/Footer'

import EnhanceTool  from './components/tools/EnhanceTool'
import ResizeTool   from './components/tools/ResizeTool'
import CompressTool from './components/tools/CompressTool'
import CropTool     from './components/tools/CropTool'
import FiltersTool  from './components/tools/FiltersTool'
import ConvertTool  from './components/tools/ConvertTool'

import { checkHealth } from './services/api'

function getImageInfo(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const ext = file.name.split('.').pop().toUpperCase()
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        format: ext === 'JPG' ? 'JPEG' : ext,
        hasAlpha: ext === 'PNG' || ext === 'WEBP',
      })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      resolve({ width: 0, height: 0, format: 'UNKNOWN', hasAlpha: false })
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

export default function App() {
  const [backendOnline, setBackendOnline]     = useState(null)
  const [file, setFile]                       = useState(null)
  const [imageInfo, setImageInfo]             = useState(null)
  const [currentBlob, setCurrentBlob]         = useState(null)
  const [currentTool, setCurrentTool]         = useState('enhance')
  const [workspaceOpen, setWorkspaceOpen]     = useState(false)

  const workspaceRef = useRef(null)

  // Health check on mount
  useEffect(() => {
    checkHealth()
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false))
  }, [])

  const handleImageUpload = useCallback(async (uploadedFile) => {
    setFile(uploadedFile)
    setCurrentBlob(null)
    setWorkspaceOpen(true)
    const info = await getImageInfo(uploadedFile)
    setImageInfo(info)
    // Scroll to workspace
    setTimeout(() => workspaceRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [])

  const handleToolResult = useCallback((blob) => {
    setCurrentBlob(blob)
  }, [])

  const handleReset = useCallback(() => {
    setCurrentBlob(null)
  }, [])

  const handleClose = useCallback(() => {
    setFile(null)
    setCurrentBlob(null)
    setImageInfo(null)
    setWorkspaceOpen(false)
  }, [])

  const handleToolSelect = useCallback((toolId) => {
    if (!file) {
      document.getElementById('upload-trigger')?.click()
      return
    }
    setCurrentTool(toolId)
    setWorkspaceOpen(true)
    setTimeout(() => workspaceRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [file])

  // The file currently being worked on (original or current edited)
  const workingFile = useCallback(() => {
    if (!currentBlob) return file
    return new File([currentBlob], file?.name || 'image.png', { type: currentBlob.type })
  }, [currentBlob, file])

  const renderTool = () => {
    const wf = workingFile()
    const props = {
      file: wf,
      imageInfo,
      onResult: handleToolResult,
    }
    switch (currentTool) {
      case 'enhance':  return <EnhanceTool  {...props} />
      case 'resize':   return <ResizeTool   {...props} />
      case 'compress': return <CompressTool {...props} />
      case 'crop':     return <CropTool     {...props} />
      case 'filters':  return <FiltersTool  {...props} />
      case 'convert':  return <ConvertTool  {...props} />
      default:         return null
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        onUploadClick={() => document.getElementById('global-upload')?.click()}
        backendOnline={backendOnline === true}
      />

      {/* Hidden global file input */}
      <input
        id="global-upload"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => { if (e.target.files[0]) handleImageUpload(e.target.files[0]) }}
      />

      <main className="flex-1">
        {/* Show hero only when no image loaded */}
        {!workspaceOpen && (
          <>
            <Hero onImageUpload={handleImageUpload} />
            <ToolCards onToolSelect={handleToolSelect} />
          </>
        )}

        {/* Workspace */}
        {workspaceOpen && file && (
          <div ref={workspaceRef}>
            <ImageWorkspace
              originalFile={file}
              currentBlob={currentBlob}
              currentTool={currentTool}
              onToolChange={setCurrentTool}
              onReset={handleReset}
              onClose={handleClose}
              imageInfo={imageInfo}
            />
            {/* Tool panel */}
            <div className="max-w-3xl mx-auto px-4 pb-16">
              {renderTool()}
            </div>
          </div>
        )}

        {/* Tool cards below workspace too */}
        {workspaceOpen && (
          <div className="bg-gray-50 border-t border-gray-100 py-8">
            <div className="max-w-7xl mx-auto px-4">
              <p className="text-sm font-medium text-gray-500 mb-4">Switch tool:</p>
              <ToolCards onToolSelect={handleToolSelect} />
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* Backend offline banner */}
      {backendOnline === false && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white text-sm px-6 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-300" />
          Backend server is offline. Please start the Flask backend.
        </div>
      )}
    </div>
  )
}
