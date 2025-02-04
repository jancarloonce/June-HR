import { useState, useEffect, useRef } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface ExamSheetProps {
  isSheetLoading: boolean
  onSheetLoad: () => void
  sheetUrl: string | null
  isRecognitionActive: boolean
}

export function ExamSheet({ isSheetLoading, onSheetLoad, sheetUrl, isRecognitionActive }: ExamSheetProps) {
  const [error, setError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (sheetUrl) {
      console.log("Sheet URL loaded:", sheetUrl)
    }
  }, [sheetUrl])

  const getEmbedUrl = (url: string) => {
    const match = url.match(/\/d\/(.+?)\//)
    if (match && match[1]) {
      return `https://docs.google.com/spreadsheets/d/${match[1]}/edit?usp=sharing`
    }
    return url
  }

  useEffect(() => {
    if (sheetUrl && iframeRef.current) {
      iframeRef.current.src = getEmbedUrl(sheetUrl)
    }
  }, [sheetUrl, getEmbedUrl]) // Added getEmbedUrl to dependencies

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <CardTitle>Exam Sheet</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        <div className="relative w-full h-full">
          {(isSheetLoading || !sheetUrl) && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
              <p className="text-red-500">{error}</p>
            </div>
          )}
          <iframe
            ref={iframeRef}
            className={`w-full h-full border-none ${isRecognitionActive ? "pointer-events-none" : ""}`}
            allowFullScreen
            onLoad={() => {
              console.log("Sheet iframe loaded")
              onSheetLoad()
            }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
        </div>
      </CardContent>
    </Card>
  )
}

