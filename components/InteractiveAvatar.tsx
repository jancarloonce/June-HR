"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskMode,
  TaskType,
} from "@heygen/streaming-avatar"
import { ExamArea } from "./ExamArea/ExamArea"
import { SkeletonLoader } from "./SkeletonLoader"
import { CheckIcon, XIcon, Bot, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"
import LoadingCountdown from "./LoadingCountdown"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface InteractiveAvatarProps {
  onReturnToLanding: () => void
  candidateInfo: { name: string; email: string; phone: string } | null
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

export default function InteractiveAvatar({
  onReturnToLanding,
  candidateInfo,
}: InteractiveAvatarProps) {
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
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [isCreatingSheet, setIsCreatingSheet] = useState(false) // state for sheet creation
  const avatarRef = useRef<StreamingAvatar | null>(null)
  const recognitionRef = useRef<any>(null)
  const [initialSheetData, setInitialSheetData] = useState<any>(null)
  const [examResult, setExamResult] = useState<ExamResult | null>(null)
  const [isGreeting, setIsGreeting] = useState(false)
  const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(null)
  const [followUpResponse, setFollowUpResponse] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState<string>("")
  const [isInitializing, setIsInitializing] = useState(false)
  const [sheetError, setSheetError] = useState<string | null>(null)

  // Ref to track if the greeting has already been spoken.
  const hasGreetedRef = useRef(false)
  const isGreetingRef = useRef(isGreeting)
  useEffect(() => {
    isGreetingRef.current = isGreeting
  }, [isGreeting])

  const sheetOpenRef = useRef(isSheetOpen)
  useEffect(() => {
    sheetOpenRef.current = isSheetOpen
  }, [isSheetOpen])

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
      const response = await fetch("/api/get-sheet-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: candidateInfo?.name }),
      })
      if (!response.ok) {
        throw new Error(`Failed to fetch sheet URL: ${response.statusText}`)
      }
      const data = await response.json()
      if (!data.url) {
        throw new Error("No sheet URL received in response")
      }
      console.log("Successfully retrieved Google Sheet URL:", data.url)

      // Attempt to open the sheet
      const sheetWindow = window.open(data.url, "_blank")
      if (!sheetWindow) {
        console.warn("Unable to open sheet automatically. It may be blocked by a popup blocker.")
      }

      return data.url
    } catch (error) {
      console.error(`Error fetching sheet URL: ${error instanceof Error ? error.message : "Unknown error occurred"}`)
      setSheetError(`Failed to create exam sheet: ${error instanceof Error ? error.message : "Unknown error"}`)
      return null
    }
  }, [candidateInfo])

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
    if (hasGreetedRef.current) {
      console.log("Greeting already spoken, skipping.")
      return
    }

    console.log("Checking if avatar is ready before speaking...")
    await new Promise((resolve) => setTimeout(resolve, 300))

    console.log("Speaking greeting...")
    try {
      avatarRef.current.closeVoiceChat()
      await avatarRef.current.speak({
        text: "Hello! I'm June from Activate Talent, your AI HR interviewer. Are you ready to start the exam?",
        taskType: TaskType.REPEAT,
        taskMode: TaskMode.SYNC,
      })
      console.log("Waiting for avatar to finish speaking (AVATAR_STOP_TALKING event)...")
      await new Promise<void>((resolve) => {
        avatarRef.current?.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
          console.log("Avatar finished speaking (event received).")
          resolve()
        })
      })
      console.log("Greeting spoken successfully")
      hasGreetedRef.current = true
    } catch (error) {
      console.log(`Error in speakGreeting: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [])

  // Fallback: Record audio via MediaRecorder and transcribe with Whisper.
  const startFallbackVoiceRecognition = useCallback((handler: (response: string) => void) => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        const mediaRecorder = new MediaRecorder(stream)
        const audioChunks: Blob[] = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data)
          }
        }

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/webm" })
          console.log("Fallback audio blob ready", audioBlob)

          // Prepare form data to send to your transcription endpoint.
          const formData = new FormData()
          formData.append("audio", audioBlob, "recording.webm") // note: key must be "audio"

          try {
            const response = await fetch("/api/transcribe-whisper", {
              method: "POST",
              body: formData,
            })

            if (!response.ok) {
              throw new Error(`Transcription failed: ${response.statusText}`)
            }

            const data = await response.json()
            const transcript = data.transcript
            console.log("Whisper transcription result:", transcript)
            handler(transcript)
          } catch (error) {
            console.error("Error transcribing with Whisper:", error)
          }
        }

        // Start recording and stop automatically after 5 seconds.
        mediaRecorder.start()
        console.log("Fallback recording started")
        setTimeout(() => {
          mediaRecorder.stop()
          console.log("Fallback recording stopped")
        }, 5000)
      })
      .catch((error) => {
        console.error("Error accessing microphone for fallback:", error)
      })
  }, [])

  // Use native SpeechRecognition if available; otherwise, fall back.
  const startVoiceRecognition = useCallback(
    (handler: (response: string) => void) => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
  
        recognitionRef.current.onstart = () => {
          console.log("Voice recognition started")
          setIsRecognitionActive(true)
        }
  
        recognitionRef.current.onresult = (event: any) => {
          if (sheetOpenRef.current) {
            console.log("Sheet is open, ignoring voice input.")
            return
          }
          if (isGreetingRef.current) {
            console.log("Greeting in progress, ignoring voice input.")
            return
          }
          const last = event.results.length - 1
          const userResponse = event.results[last][0].transcript
          console.log(`User said: ${userResponse}`)
          handler(userResponse)
        }
  
        // Update the onerror handler here:
        recognitionRef.current.onerror = (event: any) => {
          console.log(`Speech recognition error: ${event.error}`)
          if (event.error === "audio-capture") {
            console.log("Audio capture error detected. Falling back to MediaRecorder-based transcription.")
            startFallbackVoiceRecognition(handler)
          }
        }
  
        recognitionRef.current.onend = () => {
          console.log("Voice recognition ended")
          setIsRecognitionActive(false)
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
        console.log("SpeechRecognition not supported. Using fallback.")
        startFallbackVoiceRecognition(handler)
      }
    },
    [examStage, startFallbackVoiceRecognition]
  )

  const stopVoiceRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      console.log("Voice recognition stopped")
    }
  }, [])

  const pauseVoiceRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      console.log("Voice recognition paused")
    }
  }, [])

  const finishInterview = useCallback(() => {
    setExamStage("summary")
    setIsSummaryAvailable(true)
    if (avatarRef.current) {
      avatarRef.current.speak({
        text: "Thank you for sharing those additional details. We appreciate your time and participation in this interview. The interview is now complete. You can now review the summary or return to the landing page when you're ready. We will be reaching out within 24 hours.",
        taskType: TaskType.REPEAT,
        taskMode: TaskMode.SYNC,
      })
      avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        stopVoiceRecognition()
      })
    }
  }, [stopVoiceRecognition])

  const handleSuccessfulCampaignResponse = useCallback(
    async (userResponse: string) => {
      console.log(`Handling successful campaign response. Length: ${userResponse.length}`)
      setSuccessfulCampaign(userResponse)

      try {
        console.log("Generating follow-up question...")
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
        console.log("Setting exam stage to followUpQuestion")
        setExamStage("followUpQuestion")
        if (avatarRef.current) {
          console.log("Avatar speaking follow-up question")
          await avatarRef.current.speak({
            text: `Thank you for sharing that experience. ${result.followUpQuestion}`,
            taskType: TaskType.REPEAT,
            taskMode: TaskMode.SYNC,
          })
          avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
            console.log("Avatar finished speaking, starting voice recognition for follow-up")
            startVoiceRecognition(handleFollowUpResponse)
          })
        }
      } catch (error) {
        console.error("Error generating follow-up question:", error)
        finishInterview()
      }
    },
    [startVoiceRecognition, finishInterview]
  )

  const handleFollowUpResponse = useCallback(
    (userResponse: string) => {
      console.log(`Handling follow-up response. Length: ${userResponse.length}`)
      setFollowUpResponse(userResponse)
      setIsSheetOpen(false)
      finishInterview()
    },
    [finishInterview]
  )

  const handleHourlyRateResponse = useCallback(
    async (userResponse: string) => {
      console.log(`Handling hourly rate response: ${userResponse}`)
      setHourlyRate(userResponse)
      setExamStage("additionalQuestion2")
      if (avatarRef.current) {
        await avatarRef.current.speak({
          text: `Thank you for sharing your expected hourly rate. Now, can you tell me about your most successful campaign?`,
          taskType: TaskType.REPEAT,
          taskMode: TaskMode.SYNC,
        })
        avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
          console.log("Avatar finished speaking about successful campaign question")
          startVoiceRecognition(handleSuccessfulCampaignResponse)
        })
      }
    },
    [startVoiceRecognition, handleSuccessfulCampaignResponse]
  )

  const askAdditionalQuestion = useCallback(async () => {
    console.log("Asking additional question...")
    setIsSummaryAvailable(false)
    if (avatarRef.current) {
      try {
        setExamStage("additionalQuestion1")
        await avatarRef.current.speak({
          text: "Now, I have a couple more questions for you. First, what is your expected hourly rate?",
          taskType: TaskType.REPEAT,
          taskMode: TaskMode.SYNC,
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
          taskType: TaskType.REPEAT,
          taskMode: TaskMode.SYNC,
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
          ? `You have successfully completed the exam. Your formula accuracy was ${result.formulaAccuracy}% and calculation accuracy was ${result.calculationAccuracy}%. ${result.feedback}`
          : `I'm sorry, Unfortunately you failed the exam. We appreciate your time and participation in this interview. The interview is now complete. You can now review the summary or return to the landing page when you're ready."`
        await avatarRef.current.speak({
          text: speechText,
          taskType: TaskType.REPEAT,
          taskMode: TaskMode.SYNC,
        })
      }

      if (result.isCorrect) {
        setTimeout(async () => {
          await askAdditionalQuestion()
        }, 2000)
      } else {
        setExamStage("finished")
      }
    } catch (error) {
      console.log(`Error submitting exam: ${error instanceof Error ? error.message : String(error)}`)
      setExamStage("error")
      if (avatarRef.current) {
        await avatarRef.current.speak({
          text: "I apologize, but there was an error submitting your exam. Please try again later.",
          taskType: TaskType.REPEAT,
          taskMode: TaskMode.SYNC,
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
    [handleSubmitExam, startVoiceRecognition]
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
    setSheetError(null)
    setIsCreatingSheet(true) // starting sheet creation

    try {
      const url = await fetchSheetUrl()
      if (!url) {
        throw new Error("Failed to fetch sheet data")
      }

      setSheetUrl(url)
      setExamStage("inProgress")
      setIsSheetOpen(true)
      setIsAvatarCentered(false)
      setIsVoiceInputActive(false)
      console.log("Exam started successfully")

      // Attempt to open the sheet
      if (!document.hidden) {
        const sheetWindow = window.open(url, "_blank")
        if (!sheetWindow) {
          console.warn("Unable to open sheet automatically. It may be blocked by a popup blocker.")
        }
      }
    } catch (error) {
      setExamStage("notStarted")
      setSheetError("Failed to load the exam sheet. Please try again.")
      console.error(`Failed to start exam: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsCreatingSheet(false)
    }
  }, [pauseVoiceRecognition, fetchSheetUrl])

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
              taskType: TaskType.REPEAT,
              taskMode: TaskMode.SYNC,
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
              taskType: TaskType.REPEAT,
              taskMode: TaskMode.SYNC,
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
    [startExam, onReturnToLanding, pauseVoiceRecognition, examStage]
  )

  const hasInitializedRef = useRef(false)

  const startSession = useCallback(async () => {
    if (hasInitializedRef.current) {
      console.log("Session already started, skipping initialization.")
      return
    }
    hasInitializedRef.current = true
    setIsLoading(true)
    setIsInitializing(true)
    console.log("Starting session...")

    const token = await fetchAccessToken()
    if (!token) {
      setIsLoading(false)
      setIsInitializing(false)
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

      // Restart voice recognition (if not greeting) when avatar stops talking.
      avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        console.log("Avatar stopped talking")
        if (avatarRef.current) {
          if (!isGreeting && examStage === "notStarted" && !isExamStarted && !isExamInProgress) {
            avatarRef.current.closeVoiceChat()
            console.log("Avatar stopped talking and voice chat closed")
            startVoiceRecognition(handleInitialResponse)
          } else {
            pauseVoiceRecognition()
          }
        }
      })

      console.log("Creating start avatar...")
      await avatarRef.current.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: "June_HR_public",
        voice: { rate: 1 },
        language: "en",
        knowledgeBase: "",
      })

      console.log("Start avatar created successfully")
      console.log("Waiting for stream to be ready...")
      await streamReadyPromise

      console.log("Starting voice chat...")
      await avatarRef.current.startVoiceChat()
      console.log("Voice chat started successfully")
      console.log("Waiting a short delay to stabilize stream...")
      await new Promise((resolve) => setTimeout(resolve, 1200))

      if (examStage === "notStarted" && !isExamStarted && !isExamInProgress) {
        startVoiceRecognition(handleInitialResponse)
      }
    } catch (error) {
      console.log(`Error during avatar initialization: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
      setIsInitializing(false)
    }
  }, [
    fetchAccessToken,
    startVoiceRecognition,
    handleInitialResponse,
    examStage,
    isExamStarted,
    isExamInProgress,
    pauseVoiceRecognition,
    isGreeting,
  ])

  useEffect(() => {
    // Auto-start the session on component mount.
    startSession()
  }, [startSession])

  useEffect(() => {
    if (isSheetOpen) {
      console.log("Sheet is open, stopping voice recognition.")
      stopVoiceRecognition()
    }
  }, [isSheetOpen, stopVoiceRecognition])

  const downloadSummary = useCallback(async () => {
    try {
      const response = await fetch("/api/generate-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          examResult,
          hourlyRate,
          successfulCampaign,
          followUpQuestion,
          followUpResponse,
          candidateInfo,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate summary")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = `interview_summary_${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error downloading summary:", error)
    }
  }, [examResult, hourlyRate, successfulCampaign, followUpQuestion, followUpResponse, candidateInfo])

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }
      setCurrentTime(now.toLocaleDateString("en-US", options).replace(",", ","))
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

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
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900">
      <header className="bg-blue-900 shadow-md w-full sticky top-0 z-50 transition-all duration-300">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white flex items-center">
            <Bot className="h-6 w-6 mr-2 text-blue-300" />
            InterviewAI
          </h1>
          <div className="text-white text-sm md:text-lg font-semibold whitespace-nowrap">
            {currentTime}
          </div>
        </div>
      </header>
      <main className="flex-grow flex flex-col items-center container mx-auto mt-4">
        <div className="w-full flex flex-col lg:flex-row gap-8 items-start justify-between">
          <motion.div
            className={`w-full ${isAvatarCentered ? "lg:w-1/2 mx-auto" : "lg:w-1/4"} space-y-4 relative mt-4`}
            animate={isAvatarCentered ? { scale: 1 } : { scale: 0.9 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-white shadow-2xl border-4 border-blue-200 transition-all duration-300">
              <CardContent className="p-4">
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4">
                  {isLoading ? (
                    isInitializing ? (
                      <LoadingCountdown
                        duration={5}
                        onComplete={() => {
                          // Countdown complete
                        }}
                      />
                    ) : (
                      <SkeletonLoader />
                    )
                  ) : stream ? (
                    <video
                      ref={(el) => {
                        if (el && !el.srcObject) {
                          el.srcObject = stream
                          el.onloadedmetadata = () => {
                            console.log("Video metadata loaded. Avatar should be visible now.")
                            if (examStage === "notStarted" && !isExamStarted && !isExamInProgress) {
                              stopVoiceRecognition()
                              setIsGreeting(true)
                              speakGreeting().then(() => {
                                setIsGreeting(false)
                                startVoiceRecognition(handleInitialResponse)
                              })
                            }
                          }
                        }
                      }}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    >
                      <track kind="captions" />
                    </video>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-gray-500">Initializing AI interviewer...</p>
                    </div>
                  )}
                </div>
                {isLoading && (
                  <div className="w-full text-center py-4 text-blue-600">
                    Starting interview session...
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          {!isAvatarCentered && (
            <motion.div
              className="w-full lg:w-3/4 h-[calc(100vh-8rem)] overflow-hidden"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.5 }}
            >
              {(examStage === "inProgress" || examStage === "verifying") && sheetUrl && (
                <div className="h-full relative">
                  {isCreatingSheet && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-lg font-semibold text-blue-600">
                          Creating your exam sheet...
                        </p>
                      </div>
                    </div>
                  )}
                  {isSubmitting ? (
                    <Card className="w-full h-full bg-white shadow-2xl border-4 border-blue-200">
                      <CardContent className="flex items-center justify-center h-full">
                        <SkeletonLoader />
                      </CardContent>
                    </Card>
                  ) : sheetError ? (
                    <Alert variant="destructive">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{sheetError}</AlertDescription>
                      <Button onClick={startExam} className="mt-4">
                        <RefreshCw className="mr-2 h-4 w-4" /> Retry
                      </Button>
                    </Alert>
                  ) : (
                    <ExamArea
                      sheetVisible={isSheetOpen}
                      isSheetLoading={false}
                      examStage={examStage}
                      sheetUrl={sheetUrl}
                      initialSheetData={initialSheetData}
                      className="h-full z-0"
                      onSubmitExam={handleSubmitExam}
                      isFullScreen={isFullScreen}
                    />
                  )}
                </div>
              )}
              {(examStage === "completed" ||
                examStage === "additionalQuestion1" ||
                examStage === "additionalQuestion2" ||
                examStage === "finished" ||
                examStage === "followUpQuestion" ||
                examStage === "summary") && (
                <Card className="w-full h-full bg-white shadow-2xl border-4 border-blue-200 overflow-y-auto">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <h2 className="text-2xl font-semibold mb-4 text-blue-900">
                        {examResult?.isCorrect ? "Exam Passed" : "Exam Needs Improvement"}
                      </h2>
                      <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                        {examResult?.isCorrect ? (
                          <CheckIcon className="w-8 h-8 text-green-600" />
                        ) : (
                          <XIcon className="w-8 h-8 text-yellow-600" />
                        )}
                      </div>
                      <p className="text-lg mb-3 text-blue-800">
                        {examResult?.isCorrect
                          ? "Congratulations! You have successfully completed the exam."
                          : "There were some issues with your exam. The interviewer will provide feedback."}
                      </p>
                      {(examStage === "finished" || examStage === "summary") && (
                        <>
                          <p className="text-sm text-blue-700 mt-4">
                            The interview is complete. You can now review the summary or return to the landing page.
                          </p>
                          <div className="mt-6 space-x-4">
                            <Button onClick={downloadSummary} className="bg-blue-600 hover:bg-blue-700 text-white">
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
            </motion.div>
          )}
        </div>
      </main>
      <footer className="bg-blue-900 text-white py-4 w-full mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2025 InterviewAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
