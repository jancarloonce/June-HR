import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ExamAreaProps {
  sheetUrl?: string
  examStage: "loading" | "inProgress" | "submitted"
  onSubmitExam: () => void
  sheetVisible: boolean
  isSheetLoading: boolean
  initialSheetData: any
  className?: string
  isFullScreen: boolean
}

export const ExamArea: React.FC<ExamAreaProps> = ({
  sheetUrl,
  examStage,
  onSubmitExam,
  sheetVisible,
  isSheetLoading,
  initialSheetData,
  className,
  isFullScreen,
}) => {
  return (
    <Card className={`w-full bg-gray-50 shadow-sm ${className} ${isFullScreen ? "fixed inset-0 z-40" : ""}`}>
      <CardContent className={`p-4 ${isFullScreen ? "h-full flex flex-col" : ""}`}>
        {sheetVisible && sheetUrl ? (
          <>
            <iframe
              src={`${sheetUrl}?embedded=true&rm=minimal`}
              className={`w-full ${isFullScreen ? "flex-grow" : "h-[calc(100vh-8rem)]"} border-none`}
              title="Exam Sheet"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
            {examStage === "inProgress" && (
              <div className="mt-2 flex justify-center">
                <Button onClick={onSubmitExam} className="bg-black hover:bg-gray-800 text-white">
                  Submit Exam
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className={`flex items-center justify-center ${isFullScreen ? "h-full" : "h-[calc(100vh-2rem)]"}`}>
            <p className="text-gray-500">
              {isSheetLoading ? "Loading exam sheet..." : "Exam sheet will appear here when ready."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

