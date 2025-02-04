import { useState, useCallback, useEffect } from "react"

export function useExamLogic(
  addDebug: (message: string) => void,
  speakAvatarResponse: (response: string) => Promise<void>,
) {
  const [examStage, setExamStage] = useState<"notStarted" | "inProgress" | "submitted" | "verifying">("notStarted")
  const [sheetVisible, setSheetVisible] = useState(false)
  const [isSheetLoading, setIsSheetLoading] = useState(false)
  const [isExamInProgress, setIsExamInProgress] = useState(false)
  const [examResult, setExamResult] = useState<any>(null)
  const [sheetUrl, setSheetUrl] = useState<string | null>(null)

  const preloadSheetUrl = useCallback(async () => {
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

  useEffect(() => {
    preloadSheetUrl()
  }, [preloadSheetUrl])

  const accessGoogleSheet = useCallback(async (): Promise<boolean> => {
    if (isSheetLoading) {
      addDebug("Sheet is already loading, skipping access")
      return false
    }
    addDebug("Accessing Google Sheet")
    setIsSheetLoading(true)
    try {
      if (sheetUrl) {
        addDebug("Using preloaded sheet URL")
        setSheetVisible(true)
        return true
      } else {
        throw new Error("Sheet URL not preloaded")
      }
    } catch (error) {
      addDebug(`Error accessing sheet: ${error instanceof Error ? error.message : "Unknown error"}`)
      return false
    } finally {
      setIsSheetLoading(false)
    }
  }, [addDebug, isSheetLoading, sheetUrl])

  const verifyExam = useCallback(async () => {
    addDebug("Verifying exam...")
    try {
      const response = await fetch("/api/verify-exam", { method: "GET" })
      if (!response.ok) {
        throw new Error("Failed to verify exam")
      }
      const result = await response.json()
      addDebug(`Exam verification result: ${JSON.stringify(result)}`)
      return { passed: result.passed }
    } catch (error) {
      addDebug(`Error verifying exam: ${error instanceof Error ? error.message : JSON.stringify(error)}`)
      return null
    }
  }, [addDebug])

  const identifySentiment = useCallback(
    async (question: string, userResponse: string): Promise<boolean> => {
      try {
        const response = await fetch("/api/sentiment-identifier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, userResponse }),
        })

        if (!response.ok) {
          throw new Error("Failed to identify sentiment")
        }

        const result = await response.json()
        addDebug(`Sentiment identification result: ${JSON.stringify(result)}`)
        return result.proceed
      } catch (error) {
        addDebug(`Error identifying sentiment: ${error instanceof Error ? error.message : JSON.stringify(error)}`)
        return false
      }
    },
    [addDebug],
  )

  const startExam = useCallback(async () => {
    addDebug("Starting exam...")

    if (!sheetUrl) {
      addDebug("Sheet URL not preloaded, fetching now...")
      await preloadSheetUrl()
    }

    if (sheetUrl) {
      setIsExamInProgress(true)
      setExamStage("inProgress")
      setSheetVisible(true)
      addDebug("Sheet made visible")
      return Promise.resolve()
    } else {
      addDebug("Failed to load sheet URL")
      throw new Error("Failed to load sheet URL")
    }
  }, [sheetUrl, preloadSheetUrl, addDebug])

  const submitExam = useCallback(async () => {
    addDebug("Submitting exam...")
    setExamStage("verifying")
    setSheetVisible(false)
    setIsExamInProgress(false)

    await speakAvatarResponse("Thank you for completing the exam. I will now verify your answers.")

    const result = await verifyExam()

    if (result !== null) {
      setExamResult(result)
      setExamStage("submitted")
      const passMessage = result.passed
        ? "Congratulations! You have passed the exam."
        : "Unfortunately, you did not pass the exam."

      await speakAvatarResponse(`${passMessage} Thank you for taking the time to complete this exam.`)
    } else {
      await speakAvatarResponse(
        "I'm sorry, but there was an error verifying your exam. Please contact the administrator. Thank you for your participation.",
      )
    }
  }, [speakAvatarResponse, verifyExam, addDebug])

  const processUserInput = useCallback(
    async (userMessage: string) => {
      addDebug(`Processing user input: ${userMessage}`)

      switch (examStage) {
        case "notStarted":
          const shouldProceed = await identifySentiment("Are you ready to take the exam?", userMessage)
          if (shouldProceed) {
            addDebug("Positive sentiment detected. Starting exam immediately.")
            // Start opening the sheet immediately
            const sheetOpeningPromise = startExam()

            // Speak the response while the sheet is opening
            await speakAvatarResponse(
              "Great to hear that! I'm opening the exam sheet now. You can begin as soon as it's visible.",
            )

            // Wait for the sheet to finish opening (if it hasn't already)
            await sheetOpeningPromise

            addDebug("Exam sheet opened and response spoken.")
          } else {
            await speakAvatarResponse(
              "I understand you're not ready yet. Please let me know when you're prepared to start the exam.",
            )
          }
          break
        case "inProgress":
          const shouldSubmit = await identifySentiment("Have you finished the exam?", userMessage)
          if (shouldSubmit) {
            await submitExam()
          } else {
            addDebug("User not ready to submit. Continuing exam.")
          }
          break
        default:
          addDebug(`Unexpected input at exam stage: ${examStage}`)
      }
    },
    [examStage, speakAvatarResponse, startExam, submitExam, identifySentiment, addDebug],
  )

  return {
    examStage,
    sheetVisible,
    isSheetLoading,
    isExamInProgress,
    examResult,
    startExam,
    submitExam,
    processUserInput,
    sheetUrl,
  }
}

