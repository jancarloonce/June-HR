"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import InteractiveAvatar from "./InteractiveAvatar"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

export function LandingPage() {
  const [isInterviewStarted, setIsInterviewStarted] = useState(false)

  const startInterview = () => {
    console.log("Start Interview button clicked")
    setIsInterviewStarted(true)
  }

  const handleReturnToLanding = () => {
    setIsInterviewStarted(false)
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {!isInterviewStarted ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-3xl font-bold text-center text-gray-900">
                Welcome to the AI Interview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-center mb-8 text-gray-600">
                Click the button below to start your interview with June, our AI HR assistant.
              </p>
              <Button
                onClick={startInterview}
                className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-6 rounded-full transition-colors duration-300 text-lg flex items-center justify-center"
              >
                Start Interview
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <InteractiveAvatar onReturnToLanding={handleReturnToLanding} />
      )}
    </div>
  )
}

