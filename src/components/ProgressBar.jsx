import { useState, useEffect } from 'react'

const ProgressBar = () => {
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    { text: 'Excel feldolgozása...', duration: 1000 },
    { text: 'Követelmények elemzése...', duration: 1000 },
    { text: 'Jira ticketek generálása...', duration: 1000 }
  ]

  useEffect(() => {
    // Start animation immediately when component mounts
    const totalDuration = 3000 // 3 seconds total
    const interval = 50 // Update every 50ms for smooth animation

    let elapsed = 0
    let currentStepStart = 0

    const timer = setInterval(() => {
      elapsed += interval
      const progressPercent = Math.min((elapsed / totalDuration) * 100, 100)
      setProgress(progressPercent)

      // Determine current step based on elapsed time
      let newStep = 0
      let stepTime = 0

      for (let i = 0; i < steps.length; i++) {
        stepTime += steps[i].duration
        if (elapsed <= stepTime) {
          newStep = i
          break
        }
      }

      if (newStep !== currentStep) {
        setCurrentStep(newStep)
      }

      if (elapsed >= totalDuration) {
        clearInterval(timer)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [])

  const currentStepData = steps[currentStep] || steps[0]

  return (
    <div className="w-full max-w-md mx-auto mt-6">
      {/* Progress Bar Container */}
      <div className="bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
        <div
          className="h-full transition-all duration-100 ease-out rounded-full"
          style={{
            width: `${progress}%`,
            backgroundColor: '#003366'
          }}
        />
      </div>

      {/* Progress Text and Percentage */}
      <div className="flex justify-between items-center mt-3">
        <div className="flex items-center space-x-3">
          {/* Animated dots */}
          <div className="flex space-x-1">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index <= currentStep
                    ? 'bg-[#003366] animate-pulse'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Current step text */}
          <span className="text-[#003366] font-medium">
            {currentStepData.text}
          </span>
        </div>

        {/* Percentage */}
        <span className="text-[#003366] font-bold text-sm">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  )
}

export default ProgressBar
