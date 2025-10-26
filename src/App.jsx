import { useState } from 'react'
import FileUpload from './components/FileUpload'
import ProgressBar from './components/ProgressBar'
import SuccessModal from './components/SuccessModal'
import GroundingDashboard from './components/GroundingDashboard'

function App() {
  const [uploadedFile, setUploadedFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [tickets, setTickets] = useState([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [showJiraModal, setShowJiraModal] = useState(false)
  const [finalSuccessMessage, setFinalSuccessMessage] = useState('')
  const [jiraSentTickets, setJiraSentTickets] = useState([])
  const [error, setError] = useState('')

  const handleFileSelect = (file) => {
    // Validate .xlsx file type
    if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.name.toLowerCase().endsWith('.xlsx')) {
      setUploadedFile(file)
      setShowSuccess(false)
      setShowJiraModal(false)
      setFinalSuccessMessage('')
      setTickets([])
      setJiraSentTickets([])
      setError('')
    } else {
      setError('Kérjük, válasszon Excel fájlt (.xlsx formátumban)')
      setTimeout(() => setError(''), 5000)
    }
  }

  const handleProcess = async () => {
    if (!uploadedFile) return

    setIsProcessing(true)
    setShowSuccess(false)
    setShowJiraModal(false)
    setFinalSuccessMessage('')

    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Hiba történt a feldolgozás során')
      }

      // Wait for ProgressBar animation to complete (3 seconds)
      setTimeout(() => {
        setTickets(data.tickets)
        setShowSuccess(true)
        setIsProcessing(false)
      }, 3000)

    } catch (error) {
      console.error('Feldolgozási hiba:', error)
      setError(`Feldolgozási hiba: ${error.message}`)
      setIsProcessing(false)
      setTimeout(() => setError(''), 8000)
    }
  }

  const handleJiraSend = () => {
    setShowJiraModal(true)
  }

  const handleJiraConfirm = async () => {
    setShowJiraModal(false)

    // Simulate API call with 2 second delay
    setTimeout(() => {
      const ticketIds = tickets.map(ticket => ticket.id).join(', ')
      setFinalSuccessMessage(`✅ Sikeresen létrehozva ${tickets.length} ticket: ${ticketIds}`)
      setJiraSentTickets(tickets)
    }, 2000)
  }

  // Calculate manual time estimate (9 minutes per ticket)
  const calculateManualTime = (ticketCount) => {
    const minutes = ticketCount * 9
    return minutes
  }

  // Calculate time savings percentage
  const calculateTimeSavings = (ticketCount) => {
    const manualSeconds = ticketCount * 9 * 60 // 9 minutes per ticket
    const aiSeconds = 35
    const savings = ((manualSeconds - aiSeconds) / manualSeconds) * 100
    return Math.round(savings)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-[#003366] text-white p-4 sm:p-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* MVM Logo */}
            <div className="bg-[#F5A623] rounded-lg px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-center">
              <span className="text-white font-black text-xl sm:text-2xl tracking-wider" style={{ fontFamily: 'Arial, sans-serif' }}>MVM</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold">BA AI Asszisztens</h1>
              <p className="text-blue-200 mt-1 text-sm sm:text-base">Excel → Jira Ticket Generálás</p>
            </div>
          </div>
          {/* Version Badge */}
          <div className="hidden sm:block">
            <span className="bg-blue-800 px-3 py-1 rounded-full text-xs font-semibold">v1.0</span>
          </div>
        </div>
      </header>
      
      <main className="flex-1 max-w-6xl mx-auto p-4 sm:p-6 w-full">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Töltse fel a BA követelményeket</h2>
          <p className="text-gray-600 mb-4 text-sm sm:text-base">Excel fájl feltöltése Jira ticket generáláshoz</p>
          
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
                <button
                  onClick={() => setError('')}
                  className="ml-3 flex-shrink-0 text-red-500 hover:text-red-700"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </button>
              </div>
            </div>
          )}

          {!isProcessing ? (
            <FileUpload
              onFileSelect={handleFileSelect}
              onProcess={handleProcess}
              disabled={isProcessing}
              uploadedFile={uploadedFile}
            />
          ) : (
            <ProgressBar />
          )}

          {/* Grounding Dashboard */}
          {showSuccess && tickets.length > 0 && (
            <div className="mt-8">
              <GroundingDashboard tickets={tickets} />
            </div>
          )}

          {showSuccess && tickets.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4 text-[#003366]">
                Generált Jira Ticketek ({tickets.length} db)
              </h3>
              <div className="grid gap-4">
                {tickets.map((ticket, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {ticket.id}
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-semibold ${
                        ticket.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                        ticket.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                        ticket.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {ticket.priority}
                      </div>
                    </div>
                    <h4 className="font-semibold text-lg mb-2">{ticket.summary}</h4>
                    <p className="text-gray-600 mb-3">{ticket.description}</p>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>👤 {ticket.assignee}</span>
                      <span>📁 {ticket.epic}</span>
                    </div>
                    {ticket.acceptanceCriteria && ticket.acceptanceCriteria.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <h5 className="font-medium text-sm mb-2">Elfogadási Kritériumok:</h5>
                        <ul className="list-disc list-inside space-y-1">
                          {ticket.acceptanceCriteria.map((criteria, idx) => (
                            <li key={idx} className="text-sm text-gray-600">{criteria}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Grounding Information */}
                    {ticket._grounding && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-sm text-gray-700">AI Grounding</h5>
                          <div className={`px-2 py-1 rounded text-xs font-semibold ${
                            ticket._grounding.validated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {ticket._grounding.validated ? 'Validated' : 'Invalid'}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Confidence: {Math.round(ticket._grounding.confidence * 100)}%</span>
                          {ticket._grounding.issues?.length > 0 && (
                            <span className="text-red-600">{ticket._grounding.issues.length} issues</span>
                          )}
                          {ticket._grounding.warnings?.length > 0 && (
                            <span className="text-yellow-600">{ticket._grounding.warnings.length} warnings</span>
                          )}
                        </div>
                        {ticket._grounding.issues?.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-red-600 font-medium">Issues:</div>
                            <ul className="text-xs text-red-600 list-disc list-inside">
                              {ticket._grounding.issues.map((issue, idx) => (
                                <li key={idx}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {ticket._grounding.warnings?.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-yellow-600 font-medium">Warnings:</div>
                            <ul className="text-xs text-yellow-600 list-disc list-inside">
                              {ticket._grounding.warnings.map((warning, idx) => (
                                <li key={idx}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Jira Send Button */}
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleJiraSend}
                  className="inline-flex items-center justify-center px-8 py-3 bg-[#003366] text-white text-lg font-semibold rounded-lg hover:bg-[#002244] transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#003366] focus:ring-offset-2 shadow-lg"
                >
                  Jira-ba Küldés
                </button>
              </div>
            </div>
          )}

          {/* Final Success Message */}
          {finalSuccessMessage && (
            <div className="mt-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="text-center mb-6">
                  <p className="text-green-800 font-semibold text-xl">{finalSuccessMessage}</p>
                </div>

                {/* Jira-ba küldött ticketek részletei */}
                <div className="mt-4">
                  <h4 className="text-lg font-bold text-green-900 mb-4">Jira-ba küldött ticketek részletei:</h4>
                  <div className="space-y-4">
                    {jiraSentTickets.map((ticket, index) => (
                      <div key={index} className="bg-white border border-green-300 rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-mono text-sm bg-green-100 px-3 py-1 rounded font-bold text-green-800">
                            ✅ {ticket.id}
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-semibold ${
                            ticket.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                            ticket.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                            ticket.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {ticket.priority}
                          </div>
                        </div>
                        <h5 className="font-semibold text-base mb-1">{ticket.summary}</h5>
                        <p className="text-gray-600 text-sm mb-2">{ticket.description.substring(0, 150)}{ticket.description.length > 150 ? '...' : ''}</p>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>👤 {ticket.assignee}</span>
                          <span>📁 {ticket.epic}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Before/After Comparison Card */}
          {finalSuccessMessage && (
            <div className="mt-8">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-[#003366] to-[#004477] p-6 text-white">
                  <h3 className="text-2xl font-bold text-center">Hatékonyság Összehasonlítása</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  {/* Manual Process */}
                  <div className="bg-red-50 p-4 sm:p-6 md:border-r border-b md:border-b-0 border-gray-200">
                    <h4 className="text-xl font-bold text-red-800 mb-4 text-center">Manuális folyamat</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">📋</span>
                        <span className="text-gray-700">Excel megnyitása</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">✍️</span>
                        <span className="text-gray-700">Copy-paste minden mező</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">🔄</span>
                        <span className="text-gray-700">Formázás javítása</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">⏱️</span>
                        <span className="text-gray-700">~9 perc / ticket</span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-red-200">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-800">
                            Total: {jiraSentTickets.length} ticket × 9 perc = {calculateManualTime(jiraSentTickets.length)} perc
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Automation */}
                  <div className="bg-green-50 p-4 sm:p-6">
                    <h4 className="text-xl font-bold text-green-800 mb-4 text-center">AI Automatizálás</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl animate-pulse">📤</span>
                        <span className="text-gray-700">Excel feltöltés (5 mp)</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl animate-bounce">🤖</span>
                        <span className="text-gray-700">AI feldolgozás (30 mp)</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl animate-pulse">✅</span>
                        <span className="text-gray-700">Ticketek kész (0 mp)</span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-green-200">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-800 animate-pulse">Total: 35 másodperc</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Savings Summary */}
                <div className="bg-gradient-to-r from-[#003366] to-[#004477] p-6 text-white text-center">
                  <div className="flex items-center justify-center space-x-4">
                    <div className="text-6xl animate-bounce">🎉</div>
                    <div>
                      <h4 className="text-3xl font-bold mb-2">{calculateTimeSavings(jiraSentTickets.length)}% időmegtakarítás!</h4>
                      <p className="text-blue-200">{calculateManualTime(jiraSentTickets.length)} perc helyett csak 35 másodperc</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Új Feltöltés Gomb */}
          {finalSuccessMessage && (
            <div className="mt-8 text-center pb-6">
              <button
                onClick={() => {
                  setUploadedFile(null)
                  setTickets([])
                  setShowSuccess(false)
                  setShowJiraModal(false)
                  setFinalSuccessMessage('')
                  setJiraSentTickets([])
                }}
                className="inline-flex items-center px-8 py-3 bg-gray-600 text-white text-lg font-semibold rounded-lg hover:bg-gray-700 transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Új Feltöltés
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#003366] text-white py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="text-center sm:text-left">
              <p className="text-sm font-semibold">MVM Csoport</p>
              <p className="text-xs text-blue-200 mt-1">Business Analyst AI Asszisztens</p>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-xs text-blue-200">© 2025 MVM. Minden jog fenntartva.</p>
              <p className="text-xs text-blue-300 mt-1">Verzió 1.0 | Támogatás: ba-support@mvm.hu</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Jira Confirmation Modal */}
      <SuccessModal
        isOpen={showJiraModal}
        tickets={tickets}
        onClose={() => setShowJiraModal(false)}
        onConfirm={handleJiraConfirm}
      />
    </div>
  )
}

export default App