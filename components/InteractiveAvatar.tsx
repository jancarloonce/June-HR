"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import StreamingAvatar, { AvatarQuality, StreamingEvents, VoiceEmotion } from "@heygen/streaming-avatar"
import { Button, Card, CardBody, CardFooter, Spinner } from "@nextui-org/react"
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
  const [isWaitingForSubmit, setIsWaitingForSubmit] = useState(false)
  const [isWaitingForReady, setIsWaitingForReady] = useState(true)

  const mediaStream = useRef<HTMLVideoElement>(null)
  const avatar = useRef<StreamingAvatar | null>(null)
  const recognitionRef = useRef<any>(null)

  const startListening = useCallback(() => {
    if (isUserTalking) {
      console.log("Already listening, no need to start again")
      return
    }
    console.log("Starting listening")
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
        setIsUserTalking(true)
      } catch (error) {
        console.error("Error starting speech recognition:", error)
        setIsUserTalking(false)
      }
    } else {
      console.error("Speech recognition not initialized")
      setIsUserTalking(false)
    }
  }, [isUserTalking])

  const stopListening = useCallback(() => {
    if (!isUserTalking) {
      console.log("Not listening, no need to stop")
      return
    }
    console.log("Stopping listening")
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
        setIsUserTalking(false)
      } catch (error) {
        console.error("Error stopping speech recognition:", error)
      }
    }
  }, [isUserTalking])

  async function fetchAccessToken() {
    try {
      console.log("Fetching HeyGen access token...")
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to fetch HeyGen access token: ${errorData.error || response.statusText}`)
      }

      const data = await response.json()
      console.log("HeyGen token response received:", data)

      if (data.error) {
        throw new Error(data.error)
      }

      if (!data.token) {
        throw new Error("No HeyGen token received in response")
      }

      console.log("HeyGen Access Token received successfully")
      return data.token
    } catch (error) {
      console.error("Error fetching HeyGen access token:", error)
      setDebug(`Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`)
      return null
    }
  }

  async function startSession() {
    setIsLoadingSession(true)
    setDebug("Starting session...")
    const newToken = await fetchAccessToken()

    if (!newToken) {
      setIsLoadingSession(false)
      setDebug("Failed to start session: No HeyGen access token")
      return
    }

    try {
      console.log("Initializing StreamingAvatar with token")
      avatar.current = new StreamingAvatar({
        token: newToken,
      })

      avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
        console.log("Avatar started talking", e)
        setIsAvatarTalking(true)
        setDebug("Avatar started talking")
        stopListening()
      })

      avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
        console.log("Avatar stopped talking", e)
        setIsAvatarTalking(false)
        setDebug("Avatar stopped talking")
        if (!isExamInProgress) {
          setTimeout(() => {
            startListening()
          }, 500) // Add a small delay before starting to listen again
        }
      })

      avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        setDebug("Stream disconnected")
        endSession()
      })

      avatar.current.on(StreamingEvents.STREAM_READY, (event) => {
        setStream(event.detail)
        setDebug("Stream ready")
        setIsWaitingForReady(true)
        speakAvatarResponse(
          "Hello! I'm June from Activate talent, your AI HR interviewer. Are you ready to take the exam?",
        )
      })

      console.log("Creating start avatar...")
      const res = await avatar.current.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: "June_HR_public",
        knowledgeBase:
          "You are June, an AI HR interviewer from Activate talent. Your role is to conduct interviews and assess candidates. " +
          "You will greet the candidate, introduce yourself, and ask if they are ready to take the exam. " +
          "The exam is about website metrics, conversion rates, and data analysis. " +
          "After the candidate confirms they're ready, you'll open the exam sheet and inform them that they may begin. " +
          "Do not provide any instructions about how to indicate they've finished. " +
          "Always start by Greeing and introducing yourself, no need to repeat question" + 
          "Do not speak again until you hear 'Done' or 'Submit' via voice recognition.",
        voice: {
          rate: 1.5,
          emotion: VoiceEmotion.NEUTRAL,
        },
        language: "en",
        disableIdleTimeout: true,
      })

      console.log("Avatar created successfully:", res)
      setDebug("Avatar created successfully")

      console.log("Starting voice chat...")
      await avatar.current.startVoiceChat({
        useSilencePrompt: false,
      })
      setDebug("Voice chat started")
      setIsWaitingForReady(true)
      // await speakAvatarResponse(
      //   "Hello! I'm June from Activate talent, your AI HR interviewer. Are you ready to take the exam?",
      // )

      // Initialize speech recognition
      if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = "en-US"

        recognitionRef.current.onstart = () => {
          console.log("Speech recognition started")
          setIsUserTalking(true)
        }

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase()
          console.log("Speech recognized:", transcript)
          if (!isAvatarTalking) {
            processUserInput(transcript)
          } else {
            console.log("Ignoring input while avatar is talking")
          }
        }

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error)
          setIsUserTalking(false)
        }

        recognitionRef.current.onend = () => {
          console.log("Speech recognition ended")
          setIsUserTalking(false)
          if (!isExamInProgress && !isAvatarTalking) {
            startListening()
          }
        }

        startListening()
      }
    } catch (error) {
      console.error("Error starting avatar session:", error)
      setDebug(`Error starting session: ${error instanceof Error ? error.message : JSON.stringify(error)}`)
    } finally {
      setIsLoadingSession(false)
    }
  }

  async function endSession() {
    try {
      stopListening()
      await avatar.current?.stopAvatar()
      setStream(undefined)
      setDebug("Session ended")
      setSheetVisible(false)
      setIsExamInProgress(false)
      setIsWaitingForSubmit(false)
      setIsWaitingForReady(true)
    } catch (error) {
      console.error("Error ending session:", error)
      setDebug(`Error ending session: ${error instanceof Error ? error.message : JSON.stringify(error)}`)
    }
  }

  async function handleUserInput(transcript: string) {
    console.log("Handling user input:", transcript)
    return transcript
  }

  async function accessGoogleSheet(): Promise<boolean> {
    console.log("Accessing Google Sheet")
    setIsSheetLoading(true)
    try {
      setSheetVisible(true)
      setDebug("Sheet accessed successfully")
      return true
    } catch (error) {
      console.error("Error accessing sheet:", error)
      setDebug(`Error accessing sheet: ${error instanceof Error ? error.message : "Unknown error"}`)
      return false
    } finally {
      setIsSheetLoading(false)
    }
  }

  async function processUserInput(userMessage: string) {
    setIsProcessing(true)
    const processedInput = await handleUserInput(userMessage)
    const lowerMessage = processedInput.toLowerCase()
    console.log("Processing user input:", lowerMessage)

    try {
      if (!isExamInProgress) {
        if ((lowerMessage.includes("yes") || lowerMessage.includes("ready")) && !isAvatarTalking && isWaitingForReady) {
          setIsWaitingForReady(false)
          await speakAvatarResponse("Understood. I'm opening the exam sheet now.")
          const success = await accessGoogleSheet()
          if (success) {
            await speakAvatarResponse("The exam sheet is now open. You may begin.")
            setIsExamInProgress(true)
            setIsWaitingForSubmit(true)
            stopListening() // Stop listening after the exam starts
          } else {
            await speakAvatarResponse(
              "I apologize, but I'm having trouble accessing the exam sheet. Please wait a moment while I try to resolve this issue.",
            )
          }
        }
      } else if (isWaitingForSubmit && (lowerMessage.includes("done") || lowerMessage.includes("submit"))) {
        setIsWaitingForSubmit(false)
        setIsExamInProgress(false)
        await speakAvatarResponse(
          "Thank you for completing the exam. I'll review your answers and get back to you soon.",
        )
        // Here you can add logic to handle the exam submission
      }
    } finally {
      setIsProcessing(false)
    }
  }

  async function speakAvatarResponse(response: string) {
    if (avatar.current) {
      try {
        await avatar.current.speak({
          text: response,
        })
      } catch (error) {
        console.error("Error making avatar speak:", error)
        setDebug(`Error making avatar speak: ${error instanceof Error ? error.message : JSON.stringify(error)}`)
      }
    }
  }

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play()
        setDebug("Playing")
      }
    }
  }, [stream])

  return (
    <div className="w-full h-screen flex flex-col md:flex-row">
      {/* Left side - June avatar */}
      <div className="w-full md:w-1/2 h-full flex flex-col">
        <Card className="flex-grow">
          <CardBody className="p-0">
            {stream ? (
              <div className="relative h-full w-full">
                <video ref={mediaStream} autoPlay playsInline className="w-full h-full object-cover">
                  <track kind="captions" />
                </video>
                <div className="absolute bottom-4 left-4 flex items-center space-x-2 bg-black bg-opacity-50 rounded-full px-3 py-1">
                  {isAvatarTalking ? (
                    <Volume2 className="h-5 w-5 text-white animate-pulse" />
                  ) : isUserTalking ? (
                    <Mic className="h-5 w-5 text-white animate-pulse" />
                  ) : isProcessing ? (
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  ) : (
                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                  )}
                  <span className="text-white text-sm">
                    {isAvatarTalking
                      ? "Speaking"
                      : isUserTalking
                        ? "Listening"
                        : isProcessing
                          ? "Thinking..."
                          : isWaitingForSubmit
                            ? "Waiting for 'Submit'"
                            : "Ready"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-100">
                {!isLoadingSession ? (
                  <Button
                    className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white"
                    size="lg"
                    onClick={startSession}
                  >
                    Start Voice Chat
                  </Button>
                ) : (
                  <Spinner size="lg" />
                )}
              </div>
            )}
          </CardBody>
          <CardFooter className="flex justify-between items-center">
            <span className="text-sm text-gray-500">AI Assistant: June</span>
            {stream && (
              <Button className="bg-gradient-to-tr from-red-500 to-red-300 text-white" size="sm" onClick={endSession}>
                End Session
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Right side - Sheet and other components */}
      <div className="w-full md:w-1/2 h-full overflow-y-auto p-4 space-y-4">
        {sheetVisible && (
          <Card className="w-full">
            <CardBody className="p-0">
              <div className="relative w-full h-[400px]">
                {isSheetLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}
                <iframe
                  src="https://docs.google.com/spreadsheets/d/1UQkuSlYqaBqobS5-TTFrqxTKx_efMjAeFH1mSzcpi0c/edit?gid=0#gid=0"
                  className="w-full h-full border-none"
                  allowFullScreen
                  onLoad={() => setIsSheetLoading(false)}
                />
              </div>
            </CardBody>
          </Card>
        )}

        {isWaitingForReady && (
          <Card className="w-full bg-blue-100">
            <CardBody>
              <p className="text-center text-blue-800 font-semibold">
                Say "Yes" or "Ready" to start the exam on website metrics and conversion rates
              </p>
            </CardBody>
          </Card>
        )}

        {isWaitingForSubmit && (
          <Card className="w-full bg-yellow-100">
            <CardBody>
              <p className="text-center text-yellow-800 font-semibold">
                Exam in progress. Say "Done" or "Submit" when you've finished.
              </p>
            </CardBody>
          </Card>
        )}

        <Card className="w-full">
          <CardBody>
            <h3 className="text-lg font-bold mb-2">Debug Console</h3>
            <p className="font-mono text-sm">{debug}</p>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

