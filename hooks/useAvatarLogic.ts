import { useState, useCallback, useRef, useEffect } from "react"
import StreamingAvatar, { AvatarQuality, TaskType, type SpeakRequest, StreamingEvents } from "@heygen/streaming-avatar"

type AvatarState = "initializing" | "ready" | "speaking" | "listening" | "processing"

export function useAvatarLogic(addDebug: (message: string) => void) {
  const [avatarState, setAvatarState] = useState<AvatarState>("initializing")
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [sheetUrl, setSheetUrl] = useState<string | null>(null)
  const [isUserTalking, setIsUserTalking] = useState(false)
  const avatar = useRef<StreamingAvatar | null>(null)
  const recognitionRef = useRef<any>(null)

  const createSpeakRequest = useCallback(
    (text: string): SpeakRequest => ({
      text,
      task_type: TaskType.REPEAT,
    }),
    [],
  )

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
      addDebug("Fetching sheet URL...")
      const response = await fetch("/api/get-sheet-url")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (data.url) {
        addDebug("Sheet URL fetched successfully")
        setSheetUrl(data.url)
      } else {
        throw new Error("No URL returned from the API")
      }
    } catch (error) {
      addDebug(`Error fetching sheet URL: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }, [addDebug])

  const interruptAvatar = useCallback(() => {
    if (avatar.current) {
      addDebug("Interrupting avatar speech")
      avatar.current.interrupt()
    }
  }, [addDebug])

  const startExam = useCallback(async () => {
    addDebug("Starting exam...")
    // Add your logic here to start the exam, such as showing the exam sheet
    // For now, we'll just have the avatar speak
    await avatar.current?.speak(createSpeakRequest("The exam is starting now. Good luck!"))
    addDebug("Exam started")
  }, [addDebug, createSpeakRequest])

  const handleUserResponse = useCallback(
    async (userResponse: string) => {
      addDebug(`User response received: ${userResponse}`)
      setAvatarState("processing")

      // Interrupt any ongoing avatar speech
      interruptAvatar()

      try {
        const response = await fetch("/api/sentiment-identifier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: "Are you ready to take the exam?", userResponse }),
        })
        if (!response.ok) {
          throw new Error("Failed to identify sentiment")
        }
        const result = await response.json()
        addDebug(`Sentiment analysis result: ${JSON.stringify(result)}`)

        setAvatarState("speaking")
        if (result.proceed) {
          addDebug("Preparing to speak positive response")
          await avatar.current?.speak(createSpeakRequest("Great! Let's start the exam."))
          addDebug("Positive response spoken")
          avatar.current?.stopListening()
          await startExam()
        } else {
          addDebug("Preparing to speak negative response")
          await avatar.current?.speak(createSpeakRequest("I understand. When you're ready, just let me know."))
          addDebug("Negative response spoken")
          avatar.current?.stopListening()
        }

        setAvatarState("listening")
      } catch (error) {
        addDebug(`Error processing user response: ${error instanceof Error ? error.message : String(error)}`)
        setAvatarState("listening")
      }
    },
    [addDebug, createSpeakRequest, interruptAvatar, startExam],
  )

  const startVoiceRecognition = useCallback(() => {
    if (avatarState !== "listening") {
      addDebug(`Not starting voice recognition. Avatar state: ${avatarState}`)
      return
    }

    if ("webkitSpeechRecognition" in window) {
      recognitionRef.current = new (window as any).webkitSpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false

      recognitionRef.current.onstart = () => {
        addDebug("Voice recognition started")
      }

      recognitionRef.current.onresult = (event: any) => {
        const last = event.results.length - 1
        const userResponse = event.results[last][0].transcript
        addDebug(`User said: ${userResponse}`)
        handleUserResponse(userResponse)
      }

      recognitionRef.current.onerror = (event: any) => {
        addDebug(`Speech recognition error: ${event.error}`)
        if (event.error === "no-speech") {
          setTimeout(() => {
            if (avatarState === "listening") {
              recognitionRef.current?.start()
            }
          }, 100)
        }
      }

      recognitionRef.current.onend = () => {
        addDebug("Voice recognition ended")
        if (avatarState === "listening") {
          recognitionRef.current?.start()
        }
      }

      recognitionRef.current.start()
    } else {
      addDebug("Web Speech API is not supported in this browser")
    }
  }, [addDebug, handleUserResponse, avatarState])

  const speakGreeting = useCallback(async () => {
    addDebug("Speaking greeting...")
    setAvatarState("speaking")
    try {
      await avatar.current?.speak(
        createSpeakRequest(
          "Hello! I'm June from Activate talent, your AI HR interviewer. Are you ready to take the exam?",
        ),
      )
      addDebug("Greeting spoken successfully")
      setAvatarState("listening")
    } catch (error) {
      addDebug(`Error in speakGreeting: ${error instanceof Error ? error.message : String(error)}`)
      setAvatarState("listening")
    }
  }, [addDebug, createSpeakRequest])

  const startSession = useCallback(async () => {
    setIsLoadingSession(true)
    addDebug("Starting session...")
    const token = await fetchAccessToken()

    if (!token) {
      setIsLoadingSession(false)
      addDebug("Failed to start session: No HeyGen access token")
      return
    }

    try {
      addDebug("Initializing StreamingAvatar...")
      avatar.current = new StreamingAvatar({ token })

      addDebug("Setting up event listeners...")
      avatar.current.on(StreamingEvents.STREAM_READY, (event) => {
        addDebug("Stream ready event received")
        console.log(">>>>> Stream ready:", event.detail)
        setStream(event.detail)
        setAvatarState("ready")
      })

      avatar.current.on(StreamingEvents.USER_START, (event) => {
        addDebug("User started talking")
        console.log(">>>>> User started talking:", event)
        setIsUserTalking(true)
      })

      avatar.current.on(StreamingEvents.USER_STOP, (event) => {
        addDebug("User stopped talking")
        console.log(">>>>> User stopped talking:", event)
        setIsUserTalking(false)
      })

      avatar.current.on(StreamingEvents.AVATAR_START_TALKING, () => {
        addDebug("Avatar started talking")
        setAvatarState("speaking")
      })

      avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        addDebug("Avatar stopped talking")
        setAvatarState("listening")
        setTimeout(() => {
          if (avatarState === "listening") {
            startVoiceRecognition()
          }
        }, 1000)
      })


      addDebug("Creating start avatar...")
      await avatar.current.createStartAvatar({
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
      await avatar.current.startVoiceChat()
      addDebug("Voice chat started successfully")

      // Speak greeting after everything is set up
      await speakGreeting()
    } catch (error) {
      addDebug(`Error during avatar initialization: ${error instanceof Error ? error.message : String(error)}`)
      if (error instanceof Error && error.stack) {
        addDebug(`Error stack: ${error.stack}`)
      }
      setAvatarState("initializing") // Reset to initial state in case of error
    } finally {
      setIsLoadingSession(false)
    }
  }, [addDebug, fetchAccessToken, speakGreeting, startVoiceRecognition, avatarState])

  useEffect(() => {
    if (avatarState === "listening") {
      startVoiceRecognition()
    }
  }, [avatarState, startVoiceRecognition])

  useEffect(() => {
    return () => {
      if (avatar.current) {
        avatar.current.removeAllListeners()
        avatar.current = null
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  return {
    isLoadingSession,
    stream,
    startSession,
    sheetUrl,
    avatarState,
    interruptAvatar,
    startExam,
    avatar,
    startVoiceRecognition,
    isUserTalking,
  }
}

