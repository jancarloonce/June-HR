"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import StreamingAvatar, { AvatarQuality, StreamingEvents, TaskType } from "@heygen/streaming-avatar"
import { ExamArea } from "./ExamArea/ExamArea"
import { ExamPlaceholder } from "./ExamPlaceholder/ExamPlaceholder"
import { SkeletonLoader } from "./SkeletonLoader"
import { CheckIcon } from "lucide-react"

interface InteractiveAvatarProps {
  onReturnToLanding: () => void
}

export default function InteractiveAvatar({ onReturnToLanding }: InteractiveAvatarProps) {
  const [debug, setDebug] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [examStage, setExamStage] = useState<
    | "notStarted"
    | "loading"
    | "inProgress"
    | "verifying"
    | "completed"
    | "additionalQuestion1"
    | "additionalQuestion2"
    | "finished"
  >("notStarted")
  const [sheetUrl, setSheetUrl] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isRecognitionActive, setIsRecognitionActive] = useState(false)
  const [hourlyRate, setHourlyRate] = useState<string | null>(null)
  const [successfulCampaign, setSuccessfulCampaign] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false) // Added state for submission loading
  const avatarRef = useRef<StreamingAvatar | null>(null)
  const recognitionRef = useRef<any>(null)

  const addDebug = useCallback((message: string) => {
    setDebug((prevDebug) => `${prevDebug}\n${new Date().toISOString()}: ${message}`)
    console.log(message)
  }, [])

  const fetchAccessToken = useCallback(async () => {
    try {
      addDebug("Fetching HeyGen access token...")
      const response = await fetch("/api/get-access-token", { method: "POST" })
      if (!response.ok) {
        throw new Error(`Failed to fetch HeyGen access token: ${response.statusText}`)
      }
      const data = await response.json()
      if (!data.token) {
        throw new Error("No HeyGen token received in response")
      }
      addDebug("Successfully retrieved HeyGen access token")
      return data.token
    } catch (error) {
      addDebug(`Error fetching access token: ${error instanceof Error ? error.message : "Unknown error occurred"}`)
      return null
    }
  }, [addDebug])

  const fetchSheetUrl = useCallback(async () => {
    try {
      addDebug("Fetching Google Sheet URL...")
      const response = await fetch("/api/get-sheet-url")
      if (!response.ok) {
        throw new Error(`Failed to fetch sheet URL: ${response.statusText}`)
      }
      const data = await response.json()
      if (!data.url) {
        throw new Error("No sheet URL received in response")
      }
      addDebug("Successfully retrieved Google Sheet URL")
      return data.url
    } catch (error) {
      addDebug(`Error fetching sheet URL: ${error instanceof Error ? error.message : "Unknown error occurred"}`)
      return null
    }
  }, [addDebug])

  const speakGreeting = useCallback(async () => {
    if (!avatarRef.current) {
      addDebug("Avatar not initialized, cannot speak greeting")
      return
    }

    addDebug("Speaking greeting...")
    try {
      await avatarRef.current.speak({
        text: "Hello! I'm June from Activate talent, your AI HR interviewer. Are you ready to start the exam?",
        task_type: TaskType.REPEAT,
      })
      addDebug("Greeting spoken successfully")
    } catch (error) {
      addDebug(`Error in speakGreeting: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [addDebug])

  const startVoiceRecognition = useCallback(
    (handler: (response: string) => void) => {
      if ("webkitSpeechRecognition" in window) {
        recognitionRef.current = new (window as any).webkitSpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false

        recognitionRef.current.onstart = () => {
          addDebug("Voice recognition started")
          setIsRecognitionActive(true)
        }

        recognitionRef.current.onresult = (event: any) => {
          const last = event.results.length - 1
          const userResponse = event.results[last][0].transcript
          addDebug(`User said: ${userResponse}`)
          handler(userResponse)
        }

        recognitionRef.current.onerror = (event: any) => {
          addDebug(`Speech recognition error: ${event.error}`)
        }

        recognitionRef.current.onend = () => {
          addDebug("Voice recognition ended")
          setIsRecognitionActive(false)
        }

        recognitionRef.current.start()
      } else {
        addDebug("Web Speech API is not supported in this browser")
      }
    },
    [addDebug],
  )

  const stopVoiceRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      addDebug("Voice recognition stopped")
    }
  }, [addDebug])

  const startExam = useCallback(async () => {
    addDebug("Starting exam...")
    setExamStage("loading")
    const url = await fetchSheetUrl()
    if (url) {
      setSheetUrl(url)
      setExamStage("inProgress")
      setIsSheetOpen(true)
      addDebug("Exam started successfully")
      startVoiceRecognition(handleVoiceSubmission) //Start voice recognition for exam submission
    } else {
      setExamStage("notStarted")
      addDebug("Failed to start exam: Could not fetch sheet URL")
    }
  }, [addDebug, fetchSheetUrl, startVoiceRecognition])

  const handleInitialResponse = useCallback(
    async (userResponse: string) => {
      addDebug(`Handling initial response: ${userResponse}`)
      try {
        const response = await fetch("/api/sentiment-identifier", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: "Are you ready to start the exam?",
            userResponse: userResponse,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        const sentiment = result.proceed ? "positive" : "negative"
        addDebug(`Sentiment analysis result: ${sentiment}`)

        if (sentiment === "positive") {
          await avatarRef.current?.speak({
            text: "Great! Let's begin the exam. I'm opening the exam sheet now. Good luck!",
            task_type: TaskType.REPEAT,
          })
          startExam()
        } else {
          await avatarRef.current?.speak({
            text: "I understand. Thank you for your time. You can start the interview again when you're ready.",
            task_type: TaskType.REPEAT,
          })
          avatarRef.current?.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
            onReturnToLanding()
          })
        }
      } catch (error) {
        addDebug(`Error in handleInitialResponse: ${error instanceof Error ? error.message : String(error)}`)
      }
    },
    [addDebug, startExam, onReturnToLanding],
  )

  const handleSuccessfulCampaignResponse = useCallback(
    async (userResponse: string) => {
      addDebug(`Handling successful campaign response: ${userResponse}`)
      setSuccessfulCampaign(userResponse)
      setExamStage("finished")
      if (avatarRef.current) {
        await avatarRef.current.speak({
          text: "Thank you for sharing your experience. We appreciate your time and participation in this interview. We will reach out within 24 hours with the next steps. Goodbye and have a great day!",
          task_type: TaskType.REPEAT,
        })
        avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
          addDebug("Interview completed")
          stopVoiceRecognition()
        })
      }
    },
    [addDebug, stopVoiceRecognition],
  )

  const handleHourlyRateResponse = useCallback(
    async (userResponse: string) => {
      addDebug(`Handling hourly rate response: ${userResponse}`)
      setHourlyRate(userResponse)
      setExamStage("additionalQuestion2")
      if (avatarRef.current) {
        await avatarRef.current.speak({
          text: "Thank you. Now, can you tell me about your most successful campaign?",
          task_type: TaskType.REPEAT,
        })
        avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
          addDebug("Avatar finished speaking about successful campaign question")
          startVoiceRecognition(handleSuccessfulCampaignResponse)
        })
      }
    },
    [addDebug, startVoiceRecognition, handleSuccessfulCampaignResponse],
  )

  const askAdditionalQuestion = useCallback(async () => {
    addDebug("Asking additional question...")
    if (avatarRef.current) {
      try {
        setExamStage("additionalQuestion1")
        await avatarRef.current.speak({
          text: "Now, I have a couple more questions for you. First, what is your expected hourly rate?",
          task_type: TaskType.REPEAT,
        })
        addDebug("Additional question asked successfully")
        avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
          startVoiceRecognition(handleHourlyRateResponse)
        })
      } catch (error) {
        addDebug(`Error in askAdditionalQuestion: ${error instanceof Error ? error.message : String(error)}`)
      }
    } else {
      addDebug("Avatar not initialized, cannot ask additional question")
    }
  }, [addDebug, startVoiceRecognition, handleHourlyRateResponse])

  const startSession = useCallback(async () => {
    setIsLoading(true)
    addDebug("Starting session...")
    const token = await fetchAccessToken()

    if (!token) {
      setIsLoading(false)
      addDebug("Failed to start session: No HeyGen access token")
      return
    }

    try {
      addDebug("Initializing StreamingAvatar...")
      avatarRef.current = new StreamingAvatar({ token })

      addDebug("Setting up event listeners...")
      const streamReadyPromise = new Promise<void>((resolve) => {
        avatarRef.current!.on(StreamingEvents.STREAM_READY, (event) => {
          addDebug("Stream ready event received")
          console.log(">>>>> Stream ready:", event.detail)
          setStream(event.detail)
          resolve()
        })
      })

      avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
        console.log("Avatar stopped talking", e)
        avatarRef.current!.closeVoiceChat()
        addDebug("Avatar stopped talking and voice chat closed")
        if (examStage === "notStarted") {
          startVoiceRecognition(handleInitialResponse)
        }
      })

      avatarRef.current.on(StreamingEvents.ERROR, (error) => {
        addDebug(`StreamingAvatar error: ${JSON.stringify(error)}`)
      })

      addDebug("Creating start avatar...")
      await avatarRef.current.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: "June_HR_public",
        voice: {
          rate: 1,
        },
        language: "en",
        knowledgeBase: "",
      })
      addDebug("Start avatar created successfully")

      addDebug("Starting voice chat...")
      await avatarRef.current.startVoiceChat()
      addDebug("Voice chat started successfully")

      await streamReadyPromise
      addDebug("Stream is ready, starting greeting...")
      await speakGreeting()
    } catch (error) {
      addDebug(`Error during avatar initialization: ${error instanceof Error ? error.message : String(error)}`)
      if (error instanceof Error && error.stack) {
        addDebug(`Error stack: ${error.stack}`)
      }
    } finally {
      setIsLoading(false)
    }
  }, [addDebug, fetchAccessToken, startVoiceRecognition, handleInitialResponse, speakGreeting, examStage])

  const handleSubmitExam = useCallback(async () => {
    addDebug("Submitting exam...")
    setIsSubmitting(true) //Added
    setIsSheetOpen(false)

    await new Promise((resolve) => setTimeout(resolve, 1000)) //Simulate processing time

    setExamStage("completed")
    setIsSubmitting(false) //Added
    addDebug("Exam submitted and completed")

    if (avatarRef.current) {
      await avatarRef.current.speak({
        text: "Congratulations! You have successfully completed the exam.",
        task_type: TaskType.REPEAT,
      })
    }

    setTimeout(async () => {
      await askAdditionalQuestion()
    }, 2000)
  }, [addDebug, askAdditionalQuestion])

  const handleVoiceSubmission = useCallback(
    (userResponse: string) => {
      addDebug(`Voice submission detected: ${userResponse}`)
      if (userResponse.toLowerCase().includes("submit") || userResponse.toLowerCase().includes("finished")) {
        addDebug("Voice command to submit exam detected")
        handleSubmitExam()
      } else {
        addDebug("Voice command not recognized as submission, continuing exam")
        startVoiceRecognition(handleVoiceSubmission)
      }
    },
    [addDebug, handleSubmitExam, startVoiceRecognition],
  )

  useEffect(() => {
    return () => {
      if (avatarRef.current) {
        avatarRef.current!.closeVoiceChat()
        avatarRef.current = null
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  return (
    <div className="w-full min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-1/3 space-y-4">
            <Card className="bg-white shadow-md">
              <CardContent className="p-6">
                <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden mb-4">
                  {isLoading ? (
                    <SkeletonLoader />
                  ) : stream ? (
                    <video
                      ref={(el) => {
                        if (el) el.srcObject = stream
                      }}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    >
                      <track kind="captions" />
                    </video>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-gray-500">Avatar stream not available</p>
                    </div>
                  )}
                </div>
                {examStage === "notStarted" && (
                  <Button onClick={startSession} disabled={isLoading} className="w-full">
                    {isLoading ? "Starting..." : "Start Session"}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white shadow-md">
              <CardContent>
                <h3 className="font-bold mb-2">Debug Log:</h3>
                <div className="bg-gray-100 p-4 rounded-md max-h-[60vh] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono">{debug}</pre>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="w-full lg:w-2/3">
            {examStage === "notStarted" && <ExamPlaceholder />}
            {examStage === "loading" && <ExamPlaceholder />}
            {(examStage === "inProgress" || examStage === "verifying") && sheetUrl && (
              <div>
                {isSubmitting ? (
                  <Card className="w-full h-[calc(100vh-2rem)]">
                    <CardContent className="flex items-center justify-center h-full">
                      <SkeletonLoader />
                    </CardContent>
                  </Card>
                ) : (
                  <ExamArea
                    sheetVisible={isSheetOpen}
                    isSheetLoading={false}
                    examStage={examStage}
                    sheetUrl={sheetUrl}
                    className="h-[calc(100vh-2rem)]"
                    onSubmitExam={handleSubmitExam}
                  />
                )}
              </div>
            )}
            {(examStage === "completed" ||
              examStage === "additionalQuestion1" ||
              examStage === "additionalQuestion2" ||
              examStage === "finished") && (
              <Card className="w-full">
                <CardContent className="p-8">
                  <div className="text-center">
                    <h2 className="text-3xl font-bold mb-6 text-green-600">Exam Completed</h2>
                    <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckIcon className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-xl mb-4">Congratulations! You have successfully completed the exam.</p>
                    {examStage === "finished" && (
                      <p className="text-lg text-gray-600">
                        Thank you for your participation. We will contact you within 24 hours.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

