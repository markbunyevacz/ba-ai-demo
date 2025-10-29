import { useState, useEffect, useMemo } from 'react'
import FileUpload from './components/FileUpload'
import ProgressBar from './components/ProgressBar'
import SuccessModal from './components/SuccessModal'
import GroundingDashboard from './components/GroundingDashboard'
import StakeholderDashboard from './components/StakeholderDashboard'
import BPMNViewer from './components/BPMNViewer'
import FlowchartGenerator from './components/FlowchartGenerator'
import DiagramViewer from './components/DiagramViewer'
import DocumentPreview from './components/DocumentPreview'
import ModelSelector from './components/ModelSelector'
import bpmnService from './services/bpmnService'
import stakeholderService from './services/stakeholderService'
import groundingService from './services/groundingService'
import monitoringService from './services/monitoringService'
import diagramClient from './services/diagramClient'
import MoSCoWDashboard from './components/MoSCoWDashboard'
import prioritizationService from './services/prioritizationService'
import ComplianceReportPanel from './components/ComplianceReportPanel'

function App() {
  const [uploadedFile, setUploadedFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [tickets, setTickets] = useState([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [showJiraModal, setShowJiraModal] = useState(false)
  const [finalSuccessMessage, setFinalSuccessMessage] = useState('')
  const [jiraSentTickets, setJiraSentTickets] = useState([])
  const [error, setError] = useState('')
  
  // AI Model selection
  const [selectedAIModel, setSelectedAIModel] = useState({ provider: 'openai', model: 'gpt-4-turbo-preview' })
  
  // New state for stakeholder analysis
  const [stakeholders, setStakeholders] = useState([])
  const [stakeholderMatrix, setStakeholderMatrix] = useState(null)
  const [stakeholderNetwork, setStakeholderNetwork] = useState(null)
  const [stakeholderRecommendations, setStakeholderRecommendations] = useState([])
  const [stakeholderValidation, setStakeholderValidation] = useState(null)
  const [workflow, setWorkflow] = useState(null)
  const [bpmnXml, setBpmnXml] = useState('')
  const [workflowError, setWorkflowError] = useState('')
  const [diagram, setDiagram] = useState(null)
  const [documentPreview, setDocumentPreview] = useState(null)
  const [moscowSummary, setMoscowSummary] = useState(null)
  
  // New state for Jira OAuth
  const [jiraSessionId, setJiraSessionId] = useState(null)
  const [jiraAuthenticated, setJiraAuthenticated] = useState(false)
  const [isJiraSending, setIsJiraSending] = useState(false)
  const [jiraError, setJiraError] = useState('')

  const categoryOptions = useMemo(() => prioritizationService.getCategoryOrder(), [])

  // Check for OAuth callback and authentication status on mount
  useEffect(() => {
    // Check URL parameters for OAuth callback
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('sessionId')
    const authSuccess = params.get('auth')
    const authError = params.get('message')

    if (sessionId && authSuccess === 'success') {
      setJiraSessionId(sessionId)
      setJiraAuthenticated(true)
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
      
      // Show success message temporarily
      setError('✅ Sikeresen csatlakoztál a Jira-hoz!')
      setTimeout(() => setError(''), 3000)
    } else if (authError) {
      setJiraError(`Jira hitelesítés hiba: ${decodeURIComponent(authError)}`)
      setError(`Jira hitelesítés hiba: ${decodeURIComponent(authError)}`)
      window.history.replaceState({}, document.title, window.location.pathname)
      setTimeout(() => setJiraError(''), 5000)
    }

    // Restore session from localStorage if available
    const savedSessionId = localStorage.getItem('jiraSessionId')
    if (savedSessionId && !sessionId) {
      checkJiraStatus(savedSessionId)
    }
  }, [])

  // Check Jira authentication status
  const checkJiraStatus = async (sessionId) => {
    try {
      const response = await fetch(`/api/jira/status?sessionId=${sessionId}`)
      const data = await response.json()
      
      if (data.authenticated) {
        setJiraSessionId(sessionId)
        setJiraAuthenticated(true)
        localStorage.setItem('jiraSessionId', sessionId)
      } else {
        localStorage.removeItem('jiraSessionId')
        setJiraAuthenticated(false)
      }
    } catch (error) {
      console.error('Error checking Jira status:', error)
      localStorage.removeItem('jiraSessionId')
      setJiraAuthenticated(false)
    }
  }

  // Handle Jira login
  const handleJiraLogin = () => {
    window.location.href = '/auth/jira'
  }

  // Handle Jira logout
  const handleJiraLogout = async () => {
    try {
      if (jiraSessionId) {
        await fetch('/api/jira/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: jiraSessionId })
        })
      }
      
      setJiraSessionId(null)
      setJiraAuthenticated(false)
      localStorage.removeItem('jiraSessionId')
      setError('✅ Sikeresen kijelentkeztél a Jira-ból')
      setTimeout(() => setError(''), 3000)
    } catch (error) {
      console.error('Error logging out:', error)
      setJiraError(`Kijelentkezés hiba: ${error.message}`)
    }
  }

  const handleFileSelect = (file) => {
    // Validate .xlsx or .docx file type
    const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    file.name.toLowerCase().endsWith('.xlsx')
    const isWord = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                   file.name.toLowerCase().endsWith('.docx')
    
    if (isExcel || isWord) {
      setUploadedFile(file)
      setShowSuccess(false)
      setShowJiraModal(false)
      setFinalSuccessMessage('')
      setTickets([])
      setJiraSentTickets([])
      setStakeholders([])
      setStakeholderMatrix(null)
      setStakeholderNetwork(null)
      setStakeholderRecommendations([])
      setStakeholderValidation(null)
      setWorkflow(null)
      setBpmnXml('')
      setWorkflowError('')
      setDiagram(null)
      setDocumentPreview(null)
      setMoscowSummary(null)
      setError('')
    } else {
      setError('Kérjük, válasszon Excel (.xlsx) vagy Word (.docx) fájlt')
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
      
      // Add AI model selection to form data
      formData.append('aiProvider', selectedAIModel.provider)
      formData.append('aiModel', selectedAIModel.model)

      // Use the new /api/upload/document endpoint that supports both Excel and Word
      let response
      try {
        response = await fetch('/api/upload/document', {
          method: 'POST',
          body: formData
        })
      } catch (fetchError) {
        // Network error - server not running or connection refused
        console.error('Network error:', fetchError)
        throw new Error(
          `A szerver nem érhető el. Kérjük, ellenőrizze, hogy a backend fut-e. Hiba: ${fetchError.message}`
        )
      }

      // Check if response is valid
      if (!response) {
        throw new Error('Nincs válasz a szervertől')
      }

      // Check content-type to ensure we have JSON
      const contentType = response.headers.get('content-type')
      let data
      
      if (!contentType || !contentType.includes('application/json')) {
        // Not JSON response - might be HTML error page or no content
        const text = await response.text()
        
        if (!text || text.trim() === '') {
          throw new Error(
            `Üres válasz a szervertől (${response.status}). A szerver nem fut vagy hibát adott vissza.`
          )
        }
        
        // Try to parse as JSON anyway
        try {
          data = JSON.parse(text)
        } catch (parseError) {
          console.error('Response text:', text.substring(0, 500))
          throw new Error(
            `Érvénytelen válasz a szervertől: ${text.substring(0, 200)}`
          )
        }
      } else {
        // Parse JSON response
        try {
          data = await response.json()
        } catch (parseError) {
          console.error('JSON parse error:', parseError)
          throw new Error(
            `Nem sikerült feldolgozni a szerver válaszát: ${parseError.message}`
          )
        }
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || `Szerver hiba: ${response.status}`)
      }

      // Validate that we have the expected data
      if (!data.tickets || !Array.isArray(data.tickets)) {
        console.error('Invalid response structure:', data)
        throw new Error(
          'Érvénytelen válasz szerkezet: hiányzó vagy érvénytelen ticketlista'
        )
      }

      // Wait for ProgressBar animation to complete (3 seconds)
      setTimeout(() => {
        const prioritizedTickets = prioritizationService.classifyTickets(data.tickets)
        setTickets(prioritizedTickets)
        setMoscowSummary(prioritizationService.getPortfolioSummary(prioritizedTickets))
        setDocumentPreview(data.preview || null)
        setDiagram(data.diagrams || null)

        try {
          const workflowAnalysis = bpmnService.analyzeWorkflow(prioritizedTickets)
          const generatedXml = bpmnService.generateBPMNXML(workflowAnalysis)
          setWorkflow(workflowAnalysis)
          setBpmnXml(generatedXml)
          setWorkflowError('')

        } catch (workflowErr) {
          console.error('Workflow generation error:', workflowErr)
          setWorkflowError(`Nem sikerült a workflow létrehozása: ${workflowErr.message}`)
        }
        
        // === NEW: Perform stakeholder analysis ===
        try {
          // Extract stakeholders from tickets
          const extractedStakeholders = stakeholderService.identifyStakeholders(prioritizedTickets)
          setStakeholders(extractedStakeholders)
          
          // Generate power/interest matrix
          const matrix = stakeholderService.generatePowerInterestMatrix(extractedStakeholders)
          setStakeholderMatrix(matrix)
          
          // Analyze influence network
          const network = stakeholderService.analyzeInfluenceNetwork(extractedStakeholders)
          setStakeholderNetwork(network)
          
          // Generate engagement recommendations
          const recommendations = stakeholderService.getEngagementRecommendations(matrix)
          setStakeholderRecommendations(recommendations)
          
          // Validate stakeholder data
          const validation = groundingService.validateStakeholders(extractedStakeholders)
          const hallucinations = groundingService.detectStakeholderHallucinations(extractedStakeholders, prioritizedTickets)
          const communicationPlans = stakeholderService.generateCommunicationPlans(extractedStakeholders)
          const assignmentValidation = stakeholderService.validateAssignments(prioritizedTickets, extractedStakeholders)

          setStakeholderValidation({
            ...validation,
            hallucinations: hallucinations.hallucinations,
            suspiciousPatterns: hallucinations.suspiciousPatterns,
            communicationPlans,
            assignmentValidation
          })
        } catch (stakeholderError) {
          console.error('Stakeholder analysis error:', stakeholderError)
          // Continue even if stakeholder analysis fails
          setStakeholders([])
          setStakeholderValidation({ valid: false, issues: [stakeholderError.message], warnings: [] })
        }
        // === END: Stakeholder analysis ===
        
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

  const handleMoSCoWClassificationChange = (ticketId, category) => {
    setTickets(prevTickets => {
      const updated = prioritizationService.updateClassification(prevTickets, ticketId, category, {
        user: 'ui-dashboard',
        reason: 'Manual MoSCoW módosítás'
      })

      setMoscowSummary(prioritizationService.getPortfolioSummary(updated))
      return updated
    })
  }

  const handleJiraSend = () => {
    // Check if user is authenticated with Jira
    if (!jiraAuthenticated) {
      setJiraError('Kérjük, először csatlakozz a Jira-hoz a ticketek küldéséhez')
      setShowJiraModal(false)
      return
    }
    setShowJiraModal(true)
  }

  const handleJiraConfirm = async () => {
    setShowJiraModal(false)
    setIsJiraSending(true)
    setJiraError('')

    try {
      if (!jiraSessionId) {
        throw new Error('Nem található Jira session. Kérjük, csatlakozz újra a Jira-hoz.')
      }

      // Call real Jira API
      const requestBody = {
        tickets: tickets,
        sessionId: jiraSessionId
      }

      const sendRequest = async (attempt = 1) => {
        const response = await fetch('/api/jira/create-tickets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))

          if (response.status === 429 && attempt < 3) {
            const delay = 1000 * Math.pow(2, attempt - 1)
            console.warn(`Retrying Jira ticket creation after ${delay}ms (attempt ${attempt + 1}/3) due to rate limit`)
            await new Promise(resolve => setTimeout(resolve, delay))
            return sendRequest(attempt + 1)
          }

          return { response, data }
        }

        const data = await response.json()
        return { response, data }
      }

      const { response, data } = await sendRequest()

      if (!response.ok) {
        // If unauthorized, clear session and redirect to login
        if (response.status === 401) {
          setJiraAuthenticated(false)
          localStorage.removeItem('jiraSessionId')
          setJiraSessionId(null)
          throw new Error(data.details || 'Jira session lejárt. Kérjük, csatlakozz újra.')
        }
        throw new Error(data.details || data.error || 'Nem sikerült a ticketek létrehozása')
      }

      // Success!
      const successMessage = `✅ Sikeresen létrehozva ${data.result.successful}/${data.result.total} ticket`
      setFinalSuccessMessage(successMessage)
      setJiraSentTickets(tickets)
      
      // Show results
      if (data.result.errors && data.result.errors.length > 0) {
        console.warn('Some tickets failed:', data.result.errors)
      }

    } catch (error) {
      console.error('Jira küldés hiba:', error)
      setJiraError(`Jira küldés hiba: ${error.message}`)
        setError(`Jira küldés hiba: ${error.message}`)
        setTimeout(() => setError(''), 8000)
    } finally {
      setIsJiraSending(false)
    }
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
          {/* Version Badge and Jira Status */}
          <div className="hidden sm:flex items-center space-x-4">
            {jiraAuthenticated ? (
              <button
                onClick={handleJiraLogout}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-full transition-colors"
              >
                ✅ Jira Csatlakozva
              </button>
            ) : (
              <button
                onClick={handleJiraLogin}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-full transition-colors"
              >
                🔗 Jira Csatlakozás
              </button>
            )}
            <span className="bg-blue-800 px-3 py-1 rounded-full text-xs font-semibold">v2.0</span>
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

          {/* Jira Status Message */}
          {!jiraAuthenticated && showSuccess && (
            <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-blue-800">
                    A ticketek Jira-ba küldéséhez csatlakozz a Jira-hoz
                    <button
                      onClick={handleJiraLogin}
                      className="ml-2 font-semibold underline hover:text-blue-600"
                    >
                      Csatlakozás
                    </button>
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isProcessing ? (
            <div className="space-y-6">
              <ModelSelector
                onModelChange={setSelectedAIModel}
                disabled={isProcessing}
              />
              
              <FileUpload
                onFileSelect={handleFileSelect}
                onProcess={handleProcess}
                disabled={isProcessing}
                uploadedFile={uploadedFile}
              />
            </div>
          ) : (
            <ProgressBar />
          )}

          {showSuccess && documentPreview && (
            <div className="mt-8">
              <DocumentPreview preview={documentPreview} />
            </div>
          )}

          {/* Grounding Dashboard */}
          {showSuccess && tickets.length > 0 && (
            <div className="mt-8">
              <GroundingDashboard tickets={tickets} />
            </div>
          )}

          {showSuccess && (
            <ComplianceReportPanel tickets={tickets} />
          )}

          {showSuccess && tickets.length > 0 && (
            <div className="mt-8">
              <MoSCoWDashboard
                tickets={tickets}
                summary={moscowSummary}
                categories={categoryOptions}
                onClassificationChange={handleMoSCoWClassificationChange}
              />
            </div>
          )}

          {/* Stakeholder Analysis Dashboard */}
          {showSuccess && stakeholders.length > 0 && (
            <div className="mt-8">
              <StakeholderDashboard 
                stakeholders={stakeholders}
                matrix={stakeholderMatrix}
                recommendations={stakeholderRecommendations}
                network={stakeholderNetwork}
                validation={stakeholderValidation}
              />
            </div>
          )}

          {/* Workflow Visualization */}
          {showSuccess && tickets.length > 0 && workflow && (
            <div className="mt-8 space-y-6">
              <h3 className="text-xl font-semibold text-[#003366]">Folyamat vizualizáció</h3>
              {workflowError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                  <p className="text-sm text-red-700">{workflowError}</p>
                </div>
              )}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <FlowchartGenerator
                  tickets={tickets}
                  onWorkflowGenerated={(updatedWorkflow) => {
                    setWorkflow(updatedWorkflow)
                    try {
                      const updatedXml = bpmnService.generateBPMNXML(updatedWorkflow)
                      setBpmnXml(updatedXml)
                    } catch (generateError) {
                      console.error('Error generating BPMN from updated workflow:', generateError)
                      setWorkflowError(`BPMN generálás hiba: ${generateError.message}`)
                    }

                    diagramClient.generateFromTickets(tickets, {
                      type: 'bpmn',
                      formats: ['svg', 'xml', 'png']
                    }).then(setDiagram).catch(err => {
                      console.warn('Diagram regeneration failed:', err)
                    })
                  }}
                />
                <div className="min-h-[640px]">
                  {diagram ? (
                    <DiagramViewer
                      diagram={diagram}
                      onRefresh={setDiagram}
                    />
                  ) : (
                    <BPMNViewer
                      xml={bpmnXml}
                      allowEditing
                      onExport={(xmlContent) => setBpmnXml(xmlContent)}
                      onError={(errMsg) => setWorkflowError(errMsg)}
                    />
                  )}
                </div>
              </div>
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
                      <div className={`flex items-center space-x-2 px-3 py-1 text-xs font-medium rounded-full border ${
                        ticket.status?.toLowerCase() === 'blocked'
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-green-200 bg-green-50 text-green-700'
                      }`}>
                        {ticket.status}
                      </div>
                    </div>
                    <p className="text-gray-800 mb-2">{ticket.summary}</p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Leírás:</span> {ticket.description}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Kategória:</span> {ticket.category}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Prioritás:</span> {ticket.priority}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Szállító:</span> {ticket.vendor}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Határidő:</span> {ticket.dueDate}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Költség:</span> {ticket.cost}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Szerző:</span> {ticket.author}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Létrehozva:</span> {ticket.createdAt}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Frissítve:</span> {ticket.updatedAt}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      
      <footer className="bg-gray-800 text-white p-4 sm:p-6 text-center">
        <p>&copy; 2023 BA AI Asszisztens. Minden jog fenntartva.</p>
      </footer>
    </div>
  )
}

export default App