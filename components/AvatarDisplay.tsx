import { Button } from "@/components/ui/button"
import { CardContent, CardFooter } from "@/components/ui/card"
import { Loader2, Mic } from "lucide-react"

interface AvatarDisplayProps {
  stream: MediaStream | null
  isLoadingSession: boolean
  startSession: () => void
  sessionStarted: boolean
  isListening: boolean
}

export function AvatarDisplay({
  stream,
  isLoadingSession,
  startSession,
  sessionStarted,
  isListening,
}: AvatarDisplayProps) {
  return (
    <>
      <CardContent className="p-0">
        <div className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden">
          {!sessionStarted ? (
            <Button
              onClick={startSession}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 hover:bg-blue-600 text-white"
            >
              Start Voice Chat
            </Button>
          ) : isLoadingSession ? (
            <Loader2 className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 animate-spin text-gray-400" />
          ) : !stream ? (
            <p className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-600">
              Waiting for stream...
            </p>
          ) : (
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
          )}
          {isListening && (
            <div className="absolute bottom-4 right-4 bg-green-500 text-white p-2 rounded-full">
              <Mic className="h-6 w-6" />
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center bg-gray-100">
        <span className="text-sm text-gray-600">AI Assistant: June</span>
      </CardFooter>
    </>
  )
}

