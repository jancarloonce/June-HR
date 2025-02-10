"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import StreamingAvatar, { AvatarQuality, StreamingEvents, TaskType } from "@heygen/streaming-avatar"
import { ExamArea } from "./ExamArea/ExamArea"
import { SkeletonLoader } from "./SkeletonLoader"
import { CheckIcon, XIcon } from "lucide-react"
import { motion } from "framer-motion"

interface InteractiveAvatarProps {
  onReturnToLanding: () => void
}

interface ExamResult {
  isCorrect: boolean
  feedback: string
  formulaAccuracy: number
  calculationAccuracy: number
  errors: string[]
  suggestions: string[]
  flaggedCells: string[]
  versionA?: { expected: number; submitted: number; isCorrect: boolean }
  versionB?: { expected: number; submitted: number; isCorrect: boolean }
}

export default function InteractiveAvatar({ onReturnToLanding }: InteractiveAvatarProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [examStage, setExamStage] = useState<
    | "notStarted"
    | "loading"
    | "inProgress"
    | "verifying"
    | "completed"
    | "failed"
    | "error"
    | "submitted"
    | "additionalQuestion1"
    | "additionalQuestion2"
    | "followUpQuestion"
    | "finished"
    | "summary"
  >("notStarted")
  const [sheetUrl, setSheetUrl] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isRecognitionActive, setIsRecognitionActive] = useState(false)
  const [hourlyRate, setHourlyRate] = useState<string | null>(null)
  const [successfulCampaign, setSuccessfulCampaign] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAvatarCentered, setIsAvatarCentered] = useState(true)
  const [isSummaryAvailable, setIsSummaryAvailable] = useState(false)
  const [isVoiceInputActive, setIsVoiceInputActive] = useState(false)
  const [isExamStarted, setIsExamStarted] = useState(false)
  const [isExamInProgress, setIsExamInProgress] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false) // Added state for full screen
  const avatarRef = useRef<StreamingAvatar | null>(null)
  const recognitionRef = useRef<any>(null)
  const [initialSheetData, setInitialSheetData] = useState<any>(null)
  const [examResult, setExamResult] = useState<ExamResult | null>(null)
  const [summaryText, setSummaryText] = useState<string | null>(null)
  const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(null)
  const [followUpResponse, setFollowUpResponse] = useState<string | null>(null)

  const fetchAccessToken = useCallback(async () => {
    try {
      console.log("Fetching HeyGen access token...")
      const response = await fetch("/api/get-access-token", { method: "POST" })
      if (!response.ok) {
        throw new Error(`Failed to fetch HeyGen access token: ${response.statusText}`)
      }
      const data = await response.json()
      if (!data.token) {
        throw new Error("No HeyGen token received in response")
      }
      console.log("Successfully retrieved HeyGen access token")
      return data.token
    } catch (error) {
      console.log(`Error fetching access token: ${error instanceof Error ? error.message : "Unknown error occurred"}`)
      return null
    }
  }, [])

  const fetchSheetUrl = useCallback(async () => {
    try {
      console.log("Fetching Google Sheet URL...")
      const response = await fetch("/api/get-sheet-url")
      if (!response.ok) {
        throw new Error(`Failed to fetch sheet URL: ${response.statusText}`)
      }
      const data = await response.json()
      if (!data.url) {
        throw new Error("No sheet URL received in response")
      }
      console.log("Successfully retrieved Google Sheet URL")
      return data.url
    } catch (error) {
      console.log(`Error fetching sheet URL: ${error instanceof Error ? error.message : "Unknown error occurred"}`)
      return null
    }
  }, [])

  const fetchSheetData = useCallback(async () => {
    if (!sheetUrl) {
      throw new Error("Sheet URL is not available")
    }
    try {
      const response = await fetch("/api/get-sheet-data")
      if (!response.ok) {
        throw new Error(`Failed to fetch sheet data: ${response.statusText}`)
      }
      const data = await response.json()
      return data.data
    } catch (error) {
      console.error("Error fetching sheet data:", error)
      throw error
    }
  }, [sheetUrl])

  const speakGreeting = useCallback(async () => {
    if (!avatarRef.current) {
      console.log("Avatar not initialized, cannot speak greeting")
      return
    }

    console.log("Speaking greeting...")
    try {
      if (avatarRef.current) {
        await avatarRef.current.speak({
          text: "Hello! I'm June from Activate talent, your AI HR interviewer. Are you ready to start the exam?",
          task_type: TaskType.REPEAT,
        })
      } else {
        console.log("Avatar reference is null, cannot speak")
      }
      console.log("Greeting spoken successfully")
    } catch (error) {
      console.log(`Error in speakGreeting: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [])

  const startVoiceRecognition = useCallback(
    (handler: (response: string) => void) => {
      if ("webkitSpeechRecognition" in window) {
        recognitionRef.current = new (window as any).webkitSpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false

        recognitionRef.current.onstart = () => {
          console.log("Voice recognition started")
          setIsRecognitionActive(true)
        }

        recognitionRef.current.onresult = (event: any) => {
          const last = event.results.length - 1
          const userResponse = event.results[last][0].transcript
          console.log(`User said: ${userResponse}`)
          handler(userResponse)
        }

        recognitionRef.current.onerror = (event: any) => {
          console.log(`Speech recognition error: ${event.error}`)
        }

        recognitionRef.current.onend = () => {
          console.log("Voice recognition ended")
          setIsRecognitionActive(false)
          // Restart recognition if it ends prematurely
          if (
            examStage === "additionalQuestion1" ||
            examStage === "additionalQuestion2" ||
            examStage === "followUpQuestion"
          ) {
            startVoiceRecognition(handler)
          }
        }

        recognitionRef.current.start()
      } else {
        console.log("Web Speech API is not supported in this browser")
      }
    },
    [examStage],
  )

  const stopVoiceRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      console.log("Voice recognition stopped")
    }
  }, [])

  const pauseVoiceRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort() // Stops current session but can restart quickly
      console.log("Voice recognition paused")
    }
  }, [])

  const handleSuccessfulCampaignResponse = useCallback(
    async (userResponse: string) => {
      console.log(`Handling successful campaign response: ${userResponse}`)
      setSuccessfulCampaign(userResponse)

      try {
        const response = await fetch("/api/generate-follow-up", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ campaignDescription: userResponse }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        setFollowUpQuestion(result.followUpQuestion)

        setExamStage("followUpQuestion")
        if (avatarRef.current) {
          await avatarRef.current.speak({
            text: `Thank you for sharing that experience. ${result.followUpQuestion}`,
            task_type: TaskType.REPEAT,
          })
          avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
            startVoiceRecognition(handleFollowUpResponse)
          })
        }
      } catch (error) {
        console.error("Error generating follow-up question:", error)
        finishInterview()
      }
    },
    [startVoiceRecognition],
  )

  const handleFollowUpResponse = useCallback((userResponse: string) => {
    console.log(`Handling follow-up response: ${userResponse}`)
    setFollowUpResponse(userResponse)
    finishInterview()
  }, [])

  const finishInterview = useCallback(() => {
    setExamStage("finished")
    setIsSummaryAvailable(true)
    if (avatarRef.current) {
      avatarRef.current.speak({
        text: "Thank you for sharing those additional details. We appreciate your time and participation in this interview. The interview is now complete. You can now review the summary or return to the landing page when you're ready.",
        task_type: TaskType.REPEAT,
      })
      avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        stopVoiceRecognition()
      })
    }
  }, [stopVoiceRecognition])

  const handleHourlyRateResponse = useCallback(
    async (userResponse: string) => {
      console.log(`Handling hourly rate response: ${userResponse}`)
      setHourlyRate(userResponse)
      setExamStage("additionalQuestion2")
      if (avatarRef.current) {
        await avatarRef.current.speak({
          text: `Thank you for sharing your expected hourly rate of ${userResponse}. Now, can you tell me about your most successful campaign?`,
          task_type: TaskType.REPEAT,
        })
        avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
          console.log("Avatar finished speaking about successful campaign question")
          startVoiceRecognition(handleSuccessfulCampaignResponse)
        })
      }
    },
    [startVoiceRecognition, handleSuccessfulCampaignResponse],
  )

  const askAdditionalQuestion = useCallback(async () => {
    console.log("Asking additional question...")
    setIsSummaryAvailable(false)
    if (avatarRef.current) {
      try {
        setExamStage("additionalQuestion1")
        await avatarRef.current.speak({
          text: "Now, I have a couple more questions for you. First, what is your expected hourly rate?",
          task_type: TaskType.REPEAT,
        })
        console.log("Additional question asked successfully")
        avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
          startVoiceRecognition(handleHourlyRateResponse)
        })
      } catch (error) {
        console.log(`Error in askAdditionalQuestion: ${error instanceof Error ? error.message : String(error)}`)
      }
    } else {
      console.log("Avatar not initialized, cannot ask additional question")
    }
  }, [startVoiceRecognition, handleHourlyRateResponse])

  const handleSubmitExam = useCallback(async () => {
    console.log("Submitting exam...")
    setIsSubmitting(true)
    setIsSheetOpen(false)
    stopVoiceRecognition()

    if (!sheetUrl) {
      console.log("Error: Sheet URL is not available")
      setExamStage("error")
      if (avatarRef.current) {
        await avatarRef.current.speak({
          text: "I apologize, but there was an error submitting your exam. The sheet URL is not available.",
          task_type: TaskType.REPEAT,
        })
      }
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch("/api/verify-exam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sheetUrl }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error response:", errorText)
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
      }

      const result: ExamResult = await response.json()
      setExamResult(result)
      setIsSummaryAvailable(true)
      setExamStage("completed")
      console.log("Exam submitted and verified")

      if (avatarRef.current) {
        const speechText = result.isCorrect
          ? `Congratulations! You have successfully completed the exam. Your formula accuracy was ${result.formulaAccuracy}% and calculation accuracy was ${result.calculationAccuracy}%. ${result.feedback}`
          : `I'm sorry, but there were some issues with your exam. ${result.feedback}`
        await avatarRef.current.speak({
          text: speechText,
          task_type: TaskType.REPEAT,
        })
      }

      if (result.isCorrect) {
        setTimeout(async () => {
          await askAdditionalQuestion()
        }, 2000)
      } else {
        setExamStage("finished")
        if (avatarRef.current) {
          await avatarRef.current.speak({
            text: "I'm sorry, but there were some issues with your exam. You can review the feedback and try again if you'd like.",
            task_type: TaskType.REPEAT,
          })
        }
      }
    } catch (error) {
      console.log(`Error submitting exam: ${error instanceof Error ? error.message : String(error)}`)
      setExamStage("error")
      if (avatarRef.current) {
        await avatarRef.current.speak({
          text: "I apologize, but there was an error submitting your exam. Please try again later.",
          task_type: TaskType.REPEAT,
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [sheetUrl, stopVoiceRecognition, askAdditionalQuestion])

  const handleVoiceSubmission = useCallback(
    (userResponse: string) => {
      console.log(`Voice submission detected: ${userResponse}`)
      if (userResponse.toLowerCase().includes("submit") || userResponse.toLowerCase().includes("finished")) {
        console.log("Voice command to submit exam detected")
        handleSubmitExam()
      } else {
        console.log("Voice command not recognized as submission, continuing exam")
        startVoiceRecognition(handleVoiceSubmission)
      }
    },
    [handleSubmitExam, startVoiceRecognition],
  )

  const openVoiceInput = useCallback(() => {
    if (!isVoiceInputActive) {
      setIsVoiceInputActive(true)
      startVoiceRecognition(handleVoiceSubmission)
    }
  }, [isVoiceInputActive, startVoiceRecognition, handleVoiceSubmission])

  const startExam = useCallback(async () => {
    console.log("Starting exam...")
    setExamStage("loading")
    pauseVoiceRecognition()
    setIsExamStarted(true)
    setIsExamInProgress(true)
    try {
      const response = await fetch("/api/get-sheet-url")
      if (!response.ok) {
        throw new Error("Failed to fetch sheet data")
      }
      const { url, data } = await response.json()

      if (url && data) {
        setSheetUrl(url)
        setInitialSheetData(data)
        setExamStage("inProgress")
        setIsSheetOpen(true)
        setIsAvatarCentered(false)
        setIsVoiceInputActive(false)
        console.log("Exam started successfully")
      } else {
        throw new Error("Missing URL or data in response")
      }
    } catch (error) {
      setExamStage("notStarted")
      console.log(`Failed to start exam: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }, [pauseVoiceRecognition]) // Removed setIsExamInProgress from dependencies

  const handleInitialResponse = useCallback(
    async (userResponse: string) => {
      console.log(`Handling initial response: ${userResponse}`)
      if (examStage !== "notStarted") {
        console.log("Skipping sentiment analysis for non-initial responses")
        return
      }

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
        console.log(`Sentiment analysis result: ${sentiment}`)

        if (sentiment === "positive") {
          if (avatarRef.current) {
            await avatarRef.current.speak({
              text: "Great! Let's begin the exam. I'm opening the exam sheet now. Good luck!",
              task_type: TaskType.REPEAT,
            })
          } else {
            console.log("Avatar reference is null, cannot speak")
          }
          pauseVoiceRecognition()
          startExam()
        } else {
          if (avatarRef.current) {
            await avatarRef.current.speak({
              text: "I understand. Thank you for your time. You can start the interview again when you're ready.",
              task_type: TaskType.REPEAT,
            })
          } else {
            console.log("Avatar reference is null, cannot speak")
          }
          avatarRef.current?.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
            onReturnToLanding()
          })
        }
      } catch (error) {
        console.log(`Error in handleInitialResponse: ${error instanceof Error ? error.message : String(error)}`)
      }
    },
    [startExam, onReturnToLanding, pauseVoiceRecognition, examStage],
  )

  const startSession = useCallback(async () => {
    setIsLoading(true)
    console.log("Starting session...")
    const token = await fetchAccessToken()

    if (!token) {
      setIsLoading(false)
      console.log("Failed to start session: No HeyGen access token")
      return
    }

    try {
      console.log("Initializing StreamingAvatar...")
      avatarRef.current = new StreamingAvatar({ token })

      console.log("Setting up event listeners...")
      const streamReadyPromise = new Promise<void>((resolve) => {
        avatarRef.current!.on(StreamingEvents.STREAM_READY, (event) => {
          console.log("Stream ready event received")
          console.log(">>>>> Stream ready:", event.detail)
          setStream(event.detail)
          resolve()
        })
      })

      avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
        console.log("Avatar stopped talking", e)
        if (avatarRef.current) {
          avatarRef.current.closeVoiceChat()
          console.log("Avatar stopped talking and voice chat closed")
          if (examStage === "notStarted" && !isExamStarted && !isExamInProgress) {
            startVoiceRecognition(handleInitialResponse)
          } else {
            pauseVoiceRecognition()
          }
        } else {
          console.log("Avatar reference is null, cannot close voice chat")
        }
      })

      console.log("Creating start avatar...")
      await avatarRef.current.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: "June_HR_public",
        voice: {
          rate: 1,
        },
        language: "en",
        knowledgeBase: "",
      })
      console.log("Start avatar created successfully")

      console.log("Starting voice chat...")
      await avatarRef.current.startVoiceChat()
      console.log("Voice chat started successfully")

      await streamReadyPromise
      console.log("Stream is ready, starting greeting...")
      await speakGreeting()
    } catch (error) {
      console.log(`Error during avatar initialization: ${error instanceof Error ? error.message : String(error)}`)
      if (error instanceof Error && error.stack) {
        console.log(`Error stack: ${error.stack}`)
      }
    } finally {
      setIsLoading(false)
    }
  }, [fetchAccessToken, startVoiceRecognition, handleInitialResponse, speakGreeting, examStage, isExamInProgress]) // Added isExamInProgress to dependencies

  const downloadSummary = useCallback(() => {
    const csvContent = [
      ["Question", "Answer"],
      ["Exam Result", examResult?.isCorrect ? "Passed" : "Failed"],
      ["Formula Accuracy", `${examResult?.formulaAccuracy}%`],
      ["Calculation Accuracy", `${examResult?.calculationAccuracy}%`],
      ["Feedback", examResult?.feedback || ""],
      ["Expected Hourly Rate", hourlyRate || ""],
      ["Most Successful Campaign", successfulCampaign || ""],
      ["Follow-up Question", followUpQuestion || ""],
      ["Follow-up Response", followUpResponse || ""],
    ]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", "interview_summary.csv")
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }, [examResult, hourlyRate, successfulCampaign, followUpQuestion, followUpResponse])

  useEffect(() => {
    return () => {
      if (avatarRef.current) {
        avatarRef.current.closeVoiceChat()
        avatarRef.current = null
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  return (
    <div className="w-full min-h-screen bg-white p-4 md:p-8 pt-16">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
          <motion.div
            className={`w-full ${isAvatarCentered ? "lg:w-2/3 mx-auto" : "lg:w-1/3"} space-y-4`}
            animate={isAvatarCentered ? { scale: 1.2, y: 0 } : { scale: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-gray-50 shadow-sm">
              <CardContent className="p-4">
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4">
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
                  <Button
                    onClick={startSession}
                    disabled={isLoading}
                    className="w-full bg-black hover:bg-gray-800 text-white"
                  >
                    {isLoading ? "Starting..." : "Start Interview"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {!isAvatarCentered && (
            <motion.div
              className="w-full lg:w-2/3 lg:h-[calc(100vh-8rem)]"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.5 }}
            >
              {(examStage === "inProgress" || examStage === "verifying") && sheetUrl && (
                <div>
                  {isSubmitting ? (
                    <Card className="w-full h-[calc(100vh-2rem)] bg-gray-50 shadow-sm">
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
                      initialSheetData={initialSheetData}
                      className="h-[calc(100vh-10rem)]"
                      onSubmitExam={handleSubmitExam}
                      isFullScreen={isFullScreen} // Pass the state variable here
                    />
                  )}
                </div>
              )}
              {(examStage === "completed" ||
                examStage === "additionalQuestion1" ||
                examStage === "additionalQuestion2" ||
                examStage === "finished" ||
                examStage === "followUpQuestion") && (
                <Card className="w-full bg-gray-50 shadow-sm">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                        {examResult?.isCorrect ? "Exam Passed" : "Exam Needs Improvement"}
                      </h2>
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                        {examResult?.isCorrect ? (
                          <CheckIcon className="w-8 h-8 text-green-600" />
                        ) : (
                          <XIcon className="w-8 h-8 text-yellow-600" />
                        )}
                      </div>
                      <p className="text-lg mb-3 text-gray-700">
                        {examResult?.isCorrect
                          ? "Congratulations! You have successfully completed the exam."
                          : "There were some issues with your exam. The interviewer will provide feedback."}
                      </p>
                      {examStage === "finished" && (
                        <>
                          <p className="text-sm text-gray-600 mt-4">
                            The interview is complete. You can now review the summary or return to the landing page.
                          </p>
                          <div className="mt-6 space-x-4">
                            <Button onClick={downloadSummary} className="bg-green-500 hover:bg-green-600 text-white">
                              Download Summary
                            </Button>
                            <Button onClick={onReturnToLanding} className="bg-gray-500 hover:bg-gray-600 text-white">
                              Return to Landing Page
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              {examStage === "summary" && summaryText && (
                <Card className="w-full bg-gray-50 shadow-sm">
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-800">Interview Summary</h2>
                    <pre className="whitespace-pre-wrap text-sm text-gray-700">{summaryText}</pre>
                    <div className="mt-6 space-x-4">
                      <Button onClick={downloadSummary} className="bg-green-500 hover:bg-green-600 text-white">
                        Download Summary
                      </Button>
                      <Button onClick={onReturnToLanding} className="bg-gray-500 hover:bg-gray-600 text-white">
                        Return to Landing Page
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

