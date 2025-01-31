"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import InteractiveAvatar from "./InteractiveAvatar"

export function LandingPage() {
  const [isInterviewStarted, setIsInterviewStarted] = useState(false)

  const startInterview = () => {
    setIsInterviewStarted(true)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {!isInterviewStarted ? (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Welcome to the AI Interview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center mb-6">
              Click the button below to start your interview with June, our AI HR assistant.
            </p>
            <Button onClick={startInterview} className="w-full">
              Start Interview
            </Button>
          </CardContent>
        </Card>
      ) : (
        <InteractiveAvatar setDebug={(debug: string) => console.log(debug)} />
      )}
    </div>
  )
}

