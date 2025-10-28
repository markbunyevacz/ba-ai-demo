import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

/**
 * ModelSelector Component
 * Allows users to select AI provider and model for document analysis
 */
function ModelSelector({ onModelChange, disabled }) {
  const [providers, setProviders] = useState({})
  const [models, setModels] = useState({})
  const [selectedProvider, setSelectedProvider] = useState('openai')
  const [selectedModel, setSelectedModel] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch available models from server
  useEffect(() => {
    fetchModels()
  }, [])

  const fetchModels = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/ai/models')
      if (!response.ok) {
        throw new Error('Failed to fetch models')
      }
      const data = await response.json()
      
      setModels(data.models)
      setProviders(data.providers)
      
      // Set default provider and model
      const defaultProv = data.defaultProvider || 'openai'
      setSelectedProvider(defaultProv)
      
      // Set first recommended or first available model
      const availableModels = data.models[defaultProv] || []
      const recommendedModel = availableModels.find(m => m.recommended)
      const firstModel = availableModels[0]
      const defaultModel = recommendedModel || firstModel
      
      if (defaultModel) {
        setSelectedModel(defaultModel.id)
        onModelChange({
          provider: defaultProv,
          model: defaultModel.id
        })
      }
      
      setLoading(false)
    } catch (err) {
      console.error('Error fetching models:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  const handleProviderChange = (e) => {
    const newProvider = e.target.value
    setSelectedProvider(newProvider)
    
    // Reset model selection
    const availableModels = models[newProvider] || []
    const recommendedModel = availableModels.find(m => m.recommended)
    const firstModel = availableModels[0]
    const defaultModel = recommendedModel || firstModel
    
    if (defaultModel) {
      setSelectedModel(defaultModel.id)
      onModelChange({
        provider: newProvider,
        model: defaultModel.id
      })
    }
  }

  const handleModelChange = (e) => {
    const newModel = e.target.value
    setSelectedModel(newModel)
    onModelChange({
      provider: selectedProvider,
      model: newModel
    })
  }

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
        <p className="text-sm text-red-700">⚠️ Model loading hiba: {error}</p>
      </div>
    )
  }

  const availableModels = models[selectedProvider] || []
  const currentModel = availableModels.find(m => m.id === selectedModel)
  const providerConfigured = providers[selectedProvider]?.configured

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          🤖 AI Provider
        </label>
        <select
          value={selectedProvider}
          onChange={handleProviderChange}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="openai">OpenAI (Direct)</option>
          <option value="openrouter">OpenRouter (100+ Models)</option>
        </select>
        
        {!providerConfigured && (
          <p className="mt-1 text-xs text-amber-600">
            ⚠️ {selectedProvider === 'openai' ? 'OPENAI_API_KEY' : 'OPENROUTER_API_KEY'} nincs konfigurálva
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          🧠 Model
        </label>
        <select
          value={selectedModel}
          onChange={handleModelChange}
          disabled={disabled || !providerConfigured}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {availableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} 
              {model.recommended && ' ⭐'}
              {model.budget && ' 💰'}
              {model.premium && ' 👑'}
            </option>
          ))}
        </select>
        
        {currentModel && (
          <div className="mt-2 p-3 bg-gray-50 rounded-md space-y-1">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Szolgáltató:</span>
                <span className="ml-1 font-medium">{currentModel.provider}</span>
              </div>
              <div>
                <span className="text-gray-500">Költség:</span>
                <span className="ml-1 font-medium">{currentModel.cost}</span>
              </div>
              <div>
                <span className="text-gray-500">Sebesség:</span>
                <span className="ml-1 font-medium">{currentModel.speed}</span>
              </div>
              <div>
                <span className="text-gray-500">Minőség:</span>
                <span className="ml-1 font-medium">{currentModel.quality}</span>
              </div>
            </div>
            
            {currentModel.budget && (
              <p className="text-xs text-green-700 mt-2">
                💰 Költséghatékony választás
              </p>
            )}
            {currentModel.premium && (
              <p className="text-xs text-purple-700 mt-2">
                👑 Prémium minőség, magasabb ár
              </p>
            )}
            {currentModel.recommended && (
              <p className="text-xs text-blue-700 mt-2">
                ⭐ Ajánlott választás
              </p>
            )}
          </div>
        )}
      </div>
      
      {selectedProvider === 'openrouter' && (
        <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-md">
          ℹ️ OpenRouter akár 100+ különböző modellt támogat (GPT-4, Claude, Llama, Gemini stb.). 
          API kulcsot itt kérhetsz: <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">openrouter.ai/keys</a>
        </div>
      )}
    </div>
  )
}

ModelSelector.propTypes = {
  onModelChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool
}

ModelSelector.defaultProps = {
  disabled: false
}

export default ModelSelector

