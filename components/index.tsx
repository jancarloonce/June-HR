"use client"

import { useState, useCallback, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { AvatarDisplay } from "./AvatarDisplay"
import { useAvatarLogic } from "@/hooks/useAvatarLogic"

export default function InteractiveAvatar() {
  const [debug, setDebug] = useState<string>("")

  const addDebug = useCallback((message: string) => {
    setDebug((prevDebug) => `${prevDebug}\n${message}`)
    console.log(message)
  }, [])

  const { isLoadingSession, stream, isAvatarTalking, isUserTalking, isProcessing, startSession, endSession } =
    useAvatarLogic(addDebug)

  useEffect(() => {
    //No speech recognition or exam logic needed here.
  }, [])

  return (
    <div className="w-full min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-8">
          <div className="w-full">
            <Card className="bg-white shadow-md">
              <AvatarDisplay
                stream={stream}
                isLoadingSession={isLoadingSession}
                isAvatarTalking={isAvatarTalking}
                isUserTalking={isUserTalking}
                isProcessing={isProcessing}
                startSession={startSession}
                endSession={endSession}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

