import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ExamAreaProps {
  sheetVisible: boolean
  isSheetLoading: boolean
  examStage: string
  sheetUrl: string
  initialSheetData: any
  className?: string
  onSubmitExam: () => void
  isFullScreen: boolean
}

export function ExamArea({
  sheetVisible,
  isSheetLoading,
  examStage,
  sheetUrl,
  initialSheetData,
  className,
  onSubmitExam,
  isFullScreen,
}: ExamAreaProps) {
  return (
    <Card className={`bg-white shadow-2xl border-4 border-blue-200 ${className} flex flex-col h-full`}>
      <CardContent className="p-4 flex-grow flex flex-col h-full">
        {sheetVisible && !isSheetLoading ? (
          <div className="flex flex-col h-full">
            <div className="flex-grow mb-4" style={{ height: "calc(100% - 4rem)" }}>
              <iframe
                src={`${sheetUrl}?embedded=true`}
                className={`w-full h-full border-none ${isFullScreen ? "fixed inset-0 z-50" : ""}`}
                title="Google Sheet"
              />
            </div>
            {examStage === "inProgress" && (
              <Button
                onClick={onSubmitExam}
                className="w-full bg-blue-600 text-white hover:bg-blue-700 text-xl px-8 py-4 rounded-lg shadow-xl transition-all duration-300 font-bold transform hover:scale-105"
              >
                Submit Exam
              </Button>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-blue-700">{isSheetLoading ? "Loading exam sheet..." : "Exam sheet not available"}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

