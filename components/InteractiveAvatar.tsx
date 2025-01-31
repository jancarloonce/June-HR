"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import StreamingAvatar, { AvatarQuality, StreamingEvents, VoiceEmotion } from "@heygen/streaming-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Loader2, Mic, Volume2 } from "lucide-react"

export default function InteractiveAvatar() {
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [stream, setStream] = useState<MediaStream>()
  const [debug, setDebug] = useState<string>("")
  const [isUserTalking, setIsUserTalking] = useState(false)
  const [isAvatarTalking, setIsAvatarTalking] = useState(false)
  const [isSheetLoading, setIsSheetLoading] = useState(false)
  const [sheetVisible, setSheetVisible] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isExamInProgress, setIsExamInProgress] = useState(false)
  const [examStage, setExamStage] = useState<"notStarted" | "inProgress" | "submitted">("notStarted")

  const mediaStream = useRef<HTMLVideoElement>(null)
  const avatar = useRef<StreamingAvatar | null>(null)
  const recognitionRef = useRef<any>(null)

  const addDebug = useCallback((message: string) => {
    setDebug((prevDebug) => `${prevDebug}\n${message}`)
    console.log(message)
  }, [])

  const speakAvatarResponse = useCallback(
    async (response: string) => {
      if (avatar.current) {
        try {
          addDebug(`Avatar speaking: ${response}`)
          await avatar.current.speak({
            text: response,
          })
        } catch (error) {
          addDebug(`Error making avatar speak: ${error instanceof Error ? error.message : JSON.stringify(error)}`)
        }
      }
    },
    [addDebug],
  )

  const accessGoogleSheet = useCallback(async (): Promise<boolean> => {
    if (isSheetLoading) {
      addDebug("Sheet is already loading, skipping access")
      return true
    }
    addDebug("Accessing Google Sheet")
    setIsSheetLoading(true)
    try {
      // Simulating sheet access
      await new Promise((resolve) => setTimeout(resolve, 1000))
      addDebug("Sheet accessed successfully")
      return true
    } catch (error) {
      addDebug(`Error accessing sheet: ${error instanceof Error ? error.message : "Unknown error"}`)
      return false
    } finally {
      setIsSheetLoading(false)
    }
  }, [addDebug, isSheetLoading])

  const handleUserInput = useCallback(
    async (transcript: string) => {
      addDebug(`Handling user input: ${transcript}`)
      return transcript
    },
    [addDebug],
  )

  const stopListening = useCallback(() => {
    if (!isUserTalking) {
      addDebug("Not listening, no need to stop")
      return
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
        addDebug("Stopped listening")
      } catch (error) {
        addDebug(`Error stopping speech recognition: ${error}`)
      }
    }
    setIsUserTalking(false)
  }, [isUserTalking, addDebug])

  const startListening = useCallback(() => {
    if (isUserTalking || isAvatarTalking) {
      addDebug("Cannot start listening: User or Avatar is already talking")
      return
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
        addDebug("Started listening")
      } catch (error) {
        addDebug(`Error starting speech recognition: ${error}`)
        setIsUserTalking(false)
        initializeSpeechRecognition()
      }
    } else {
      addDebug("Speech recognition not initialized")
      setIsUserTalking(false)
      initializeSpeechRecognition()
    }
  }, [isUserTalking, isAvatarTalking, addDebug])

  const initializeSpeechRecognition = useCallback(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = "en-US"

      recognitionRef.current.onstart = () => {
        addDebug("Speech recognition started")
        setIsUserTalking(true)
      }

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase()
        addDebug(`Speech recognized: ${transcript}`)

        if (!isAvatarTalking && !isProcessing) {
          processUserInput(transcript)
        } else {
          addDebug(`Ignoring input while avatar is talking or processing`)
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        addDebug(`Speech recognition error: ${event.error}`)
        setIsUserTalking(false)
        if (event.error === "no-speech") {
          addDebug("No speech detected. Restarting listening.")
          setTimeout(startListening, 1000)
        } else if (event.error !== "aborted" && examStage !== "submitted") {
          setTimeout(startListening, 1000)
        }
      }

      recognitionRef.current.onend = () => {
        addDebug("Speech recognition ended")
        setIsUserTalking(false)
        if (examStage === "inProgress" && !isAvatarTalking && !isProcessing) {
          setTimeout(startListening, 1000)
        }
      }

      addDebug("Speech recognition initialized")
    } else {
      addDebug("Speech recognition not supported in this browser")
    }
  }, [addDebug, isAvatarTalking, isProcessing, examStage, startListening])

  const handleExamSubmission = useCallback(async () => {
    addDebug("Handling exam submission")
    setExamStage("submitted")
    setSheetVisible(false)
    addDebug(`Sheet visibility set to false`)
    setIsExamInProgress(false)
    stopListening()

    await speakAvatarResponse("Thank you for completing the exam. The session is now over.")
  }, [addDebug, speakAvatarResponse, stopListening])

  const processUserInput = useCallback(
    async (userMessage: string) => {
      if (isProcessing) {
        addDebug("Already processing input, ignoring duplicate")
        return
      }
      setIsProcessing(true)
      const processedInput = await handleUserInput(userMessage)
      const lowerMessage = processedInput.toLowerCase()
      addDebug(`Processing user input: ${lowerMessage}`)

      try {
        switch (examStage) {
          case "notStarted":
            if (lowerMessage.includes("yes") || lowerMessage.includes("ready")) {
              addDebug("User confirmed readiness. Attempting to open sheet.")
              stopListening()
              const success = await accessGoogleSheet()
              if (success) {
                addDebug("Sheet opened successfully. Starting exam.")
                setSheetVisible(true)
                setIsExamInProgress(true)
                setExamStage("inProgress")
                await speakAvatarResponse(
                  "Understood. I'm opening the exam sheet now. The exam sheet is now open. You can begin the exam. Please say 'done' or 'submit' when you're finished with your answers.",
                )
                setTimeout(startListening, 2000)
              } else {
                addDebug("Failed to open sheet. Remaining in not started stage.")
                await speakAvatarResponse(
                  "I apologize, but I'm having trouble accessing the exam sheet. Please say 'ready' again to retry.",
                )
                setTimeout(startListening, 2000)
              }
            }
            break
          case "inProgress":
            if (lowerMessage.includes("done") || lowerMessage.includes("submit")) {
              addDebug("User submitted exam. Initiating submission process.")
              await handleExamSubmission()
            } else {
              addDebug(`Exam in progress. Waiting for 'done' or 'submit'. Heard: ${lowerMessage}`)
            }
            break
          default:
            addDebug(`Unexpected input at exam stage: ${examStage}`)
        }
      } catch (error) {
        addDebug(`Error processing user input: ${error}`)
      } finally {
        setIsProcessing(false)
      }
    },
    [
      isProcessing,
      addDebug,
      examStage,
      handleUserInput,
      speakAvatarResponse,
      accessGoogleSheet,
      stopListening,
      startListening,
      handleExamSubmission,
    ],
  )

  const fetchAccessToken = useCallback(async () => {
    try {
      addDebug("Fetching HeyGen access token...")
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to fetch HeyGen access token: ${errorData.error || response.statusText}`)
      }

      const data = await response.json()
      addDebug("HeyGen token response received")

      if (data.error) {
        throw new Error(data.error)
      }

      if (!data.token) {
        throw new Error("No HeyGen token received in response")
      }

      addDebug("HeyGen Access Token received successfully")
      return data.token
    } catch (error) {
      addDebug(`Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`)
      return null
    }
  }, [addDebug])

  const startSession = useCallback(async () => {
    setIsLoadingSession(true)
    addDebug("Starting session...")
    const newToken = await fetchAccessToken()

    if (!newToken) {
      setIsLoadingSession(false)
      addDebug("Failed to start session: No HeyGen access token")
      return
    }

    try {
      addDebug("Initializing StreamingAvatar with token")
      avatar.current = new StreamingAvatar({
        token: newToken,
      })

      avatar.current.on(StreamingEvents.AVATAR_START_TALKING, () => {
        addDebug("Avatar started talking")
        setIsAvatarTalking(true)
        stopListening()
      })

      avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        addDebug("Avatar stopped talking")
        setIsAvatarTalking(false)
        if (examStage === "inProgress") {
          setTimeout(() => {
            startListening()
          }, 1000)
        }
      })

      avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        addDebug("Stream disconnected")
        endSession()
      })

      avatar.current.on(StreamingEvents.STREAM_READY, async (event) => {
        setStream(event.detail)
        addDebug("Stream ready")
        await speakAvatarResponse(
          "Hello! I'm June from Activate talent, your AI HR interviewer. Are you ready to take the exam?",
        )
        setTimeout(startListening, 2000)
      })

      addDebug("Creating start avatar...")
      const res = await avatar.current.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: "June_HR_public",
        knowledgeBase:
          "You are June, an AI HR interviewer from Activate talent. Your role is to conduct interviews and assess candidates. " +
          "You will greet the candidate, introduce yourself, and ask if they are ready to take the exam. " +
          "The exam is about website metrics, conversion rates, and data analysis. " +
          "After the candidate confirms they're ready, you'll open the exam sheet and inform them that they may begin. " +
          "Do not provide any instructions about how to indicate they've finished. " +
          "Always start by Greeting and introducing yourself, no need to repeat question" +
          "Do not speak again until you hear 'Done' or 'Submit' via voice recognition.",
        voice: {
          rate: 1.5,
          emotion: VoiceEmotion.NEUTRAL,
        },
        language: "en",
        disableIdleTimeout: true,
      })

      addDebug("Avatar created successfully")

      addDebug("Starting voice chat...")
      await avatar.current.startVoiceChat({
        useSilencePrompt: false,
      })
      addDebug("Voice chat started")

      initializeSpeechRecognition()
      startListening()
    } catch (error) {
      addDebug(`Error starting session: ${error instanceof Error ? error.message : JSON.stringify(error)}`)
    } finally {
      setIsLoadingSession(false)
    }
  }, [
    addDebug,
    fetchAccessToken,
    initializeSpeechRecognition,
    speakAvatarResponse,
    startListening,
    stopListening,
    examStage,
  ])

  const endSession = useCallback(async () => {
    try {
      stopListening()
      await avatar.current?.stopAvatar()
      setStream(undefined)
      addDebug("Session ended")
      setSheetVisible(false)
      setIsExamInProgress(false)
      setExamStage("notStarted")
    } catch (error) {
      addDebug(`Error ending session: ${error instanceof Error ? error.message : JSON.stringify(error)}`)
    }
  }, [addDebug, stopListening])

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play()
        setDebug("Playing")
      }
    }
  }, [stream])

  useEffect(() => {
    initializeSpeechRecognition()
  }, [initializeSpeechRecognition])

  useEffect(() => {
    addDebug(`Exam stage changed to: ${examStage}`)
    if (examStage === "inProgress") {
      setSheetVisible(true)
    } else if (examStage === "submitted") {
      setSheetVisible(false)
    }
    addDebug(`Sheet visibility after exam stage change: ${sheetVisible}`)
  }, [examStage, addDebug, sheetVisible])

  useEffect(() => {
    addDebug(`Sheet visibility changed to: ${sheetVisible}`)
  }, [sheetVisible, addDebug])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current.abort()
        recognitionRef.current = null
        addDebug("Speech recognition cleaned up")
      }
    }
  }, [addDebug])

  return (
    <div className="w-full min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8">
          {/* June avatar */}
          <div className={`w-full md:w-1/2`}>
            <Card className="bg-white shadow-md">
              <CardContent className="p-0">
                {stream ? (
                  <div className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden">
                    <video ref={mediaStream} autoPlay playsInline className="w-full h-full object-cover">
                      <track kind="captions" />
                    </video>
                    <div className="absolute bottom-4 left-4 flex items-center space-x-2 bg-gray-800 bg-opacity-75 rounded-full px-3 py-1">
                      {isAvatarTalking ? (
                        <Volume2 className="h-5 w-5 text-gray-200 animate-pulse" />
                      ) : isUserTalking ? (
                        <Mic className="h-5 w-5 text-gray-200 animate-pulse" />
                      ) : isProcessing ? (
                        <Loader2 className="h-5 w-5 text-gray-200 animate-spin" />
                      ) : (
                        <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                      )}
                      <span className="text-gray-200 text-sm">
                        {isAvatarTalking
                          ? "Speaking"
                          : isUserTalking
                            ? "Listening"
                            : isProcessing
                              ? "Thinking..."
                              : "Ready"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <CardContent className="aspect-video bg-gray-200 flex items-center justify-center">
                    {!isLoadingSession ? (
                      <Button className="bg-gray-700 hover:bg-gray-800 text-white" size="lg" onClick={startSession}>
                        Start Voice Chat
                      </Button>
                    ) : (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    )}
                  </CardContent>
                )}
              </CardContent>
              <CardFooter className="flex justify-between items-center bg-gray-100">
                <span className="text-sm text-gray-600">AI Assistant: June</span>
                {stream && (
                  <Button className="bg-gray-700 hover:bg-gray-800 text-white" size="sm" onClick={endSession}>
                    End Session
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>

          {/* Sheet and other components */}
          <div className={`w-full md:w-1/2 space-y-4`}>
            {sheetVisible && (
              <Card className="bg-white shadow-md">
                <CardContent className="p-0">
                  <div className="relative w-full h-[400px]">
                    {isSheetLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
                      </div>
                    )}
                    <iframe
                      src="https://docs.google.com/spreadsheets/d/1UQkuSlYqaBqobS5-TTFrqxTKx_efMjAeFH1mSzcpi0c/edit?usp=sharing"
                      className="w-full h-full border-none"
                      allowFullScreen
                      onLoad={() => setIsSheetLoading(false)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {examStage === "notStarted" && (
              <Card className="bg-gray-200 shadow-md">
                <CardContent>
                  <p className="text-center text-gray-800 font-semibold">
                    Say "Yes" or "Ready" to start the exam on website metrics and conversion rates
                  </p>
                </CardContent>
              </Card>
            )}

            {examStage === "inProgress" && (
              <Card className="bg-gray-200 shadow-md">
                <CardContent>
                  <p className="text-center text-gray-800 font-semibold">
                    Exam in progress. Say "Done" or "Submit" when you've finished.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="bg-white shadow-md">
              <CardContent>
                <h3 className="text-lg font-bold mb-2 text-gray-800">Debug Console</h3>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <p className="font-mono text-sm text-gray-600">{debug}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

