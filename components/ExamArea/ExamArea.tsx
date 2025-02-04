import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ExamAreaProps {
  sheetVisible: boolean
  isSheetLoading: boolean
  examStage: string
  sheetUrl: string | null
  className?: string
  onSubmitExam: () => void
}

export const ExamArea: React.FC<ExamAreaProps> = ({
  sheetVisible,
  isSheetLoading,
  examStage,
  sheetUrl,
  className,
  onSubmitExam,
}) => {
  return (
    <Card className={`w-full ${className}`}>
      <CardContent>
        {sheetVisible && sheetUrl ? (
          <>
            <iframe
              src={`${sheetUrl}?embedded=true&rm=minimal`}
              className="w-full h-[calc(100vh-8rem)]"
              title="Exam Sheet"
            />
            {examStage === "inProgress" && (
              <div className="mt-4 flex justify-center">
                <Button onClick={onSubmitExam}>Submit Exam</Button>
              </div>
            )}
          </>
        ) : examStage === "completed" || examStage === "failed" || examStage === "error" ? (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-2rem)]">
            <h2 className="text-2xl font-bold mb-4">
              {examStage === "completed"
                ? "Exam Completed"
                : examStage === "failed"
                  ? "Exam Needs Improvement"
                  : "Error Submitting Exam"}
            </h2>
            <p className="text-lg mb-2">
              {examStage === "completed"
                ? "Congratulations! You have completed the exam."
                : examStage === "failed"
                  ? "There were some issues with your exam. The interviewer will provide feedback."
                  : "There was an error submitting your exam. Please try again later."}
            </p>
            <p className="text-md text-gray-600">Please wait for further instructions from the interviewer.</p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[calc(100vh-2rem)]">
            {isSheetLoading ? <p>Loading exam sheet...</p> : <p>Exam sheet will appear here when ready.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

