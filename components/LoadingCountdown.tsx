"use client"

import type React from "react"
import { useState, useEffect } from "react"

interface LoadingCountdownProps {
  duration: number
  onComplete: () => void
}

const LoadingCountdown: React.FC<LoadingCountdownProps> = ({ duration, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(duration)

  useEffect(() => {
    if (timeLeft === 0) {
      onComplete()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, onComplete])

  const percentage = ((duration - timeLeft) / duration) * 100

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle
            className="text-gray-200 stroke-current"
            strokeWidth="10"
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
          ></circle>
          <circle
            className="text-blue-600 progress-ring__circle stroke-current"
            strokeWidth="10"
            strokeLinecap="round"
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
            strokeDasharray={`${2 * Math.PI * 40}`}
            strokeDashoffset={`${2 * Math.PI * 40 * (1 - percentage / 100)}`}
          ></circle>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold text-blue-600">{timeLeft}</span>
        </div>
      </div>
      <p className="text-lg font-semibold text-gray-700">Initializing avatar...</p>
    </div>
  )
}

export default LoadingCountdown

