import { useRef, useState } from 'react'

const FileUpload = ({ onFileSelect, onProcess, disabled, uploadedFile }) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      // Call onFileSelect regardless - validation happens in parent
      if (onFileSelect) {
        onFileSelect(file)
      }
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Call onFileSelect regardless - validation happens in parent
      if (onFileSelect) {
        onFileSelect(file)
      }
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-700 mb-3">
        Excel fájl feltöltése
      </label>

      <div
        className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-[#003366] bg-blue-50 scale-105'
            : disabled
            ? 'border-slate-200 bg-slate-50'
            : 'border-slate-300 hover:border-[#003366] hover:bg-slate-50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!disabled ? openFileDialog : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          onChange={handleFileSelect}
          disabled={disabled}
          className="hidden"
        />

        <div className="space-y-6">
          <div className="mx-auto w-16 h-16 text-slate-400">
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 48 48"
              className="w-full h-full"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              />
            </svg>
          </div>

          <div className="text-base text-slate-600">
            {uploadedFile ? (
              <div className="space-y-2">
                <p className="text-green-600 font-semibold text-lg">
                  ✓ Kiválasztva: {uploadedFile.name}
                </p>
                <p className="text-sm text-slate-500">
                  Kattintson a feldolgozáshoz
                </p>
              </div>
            ) : (
              <>
                <p className="font-semibold text-lg text-slate-700">
                  {isDragOver ? 'Engedje el az Excel fájlt itt' : 'Húzza ide az Excel fájlt'}
                </p>
                <p className="text-slate-500">vagy kattintson a böngészéshez</p>
              </>
            )}
          </div>

          {uploadedFile && !disabled && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (onProcess) {
                  onProcess()
                }
              }}
              className="inline-flex items-center px-8 py-3 bg-[#003366] text-white text-base font-semibold rounded-xl hover:bg-[#002244] transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#003366] focus:ring-offset-2 shadow-lg"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Feldolgozás
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default FileUpload
