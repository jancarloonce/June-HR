import { Card, CardContent } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

interface ExamResultsProps {
  isVerifying: boolean
  examResult: {
    passed: boolean
  } | null
}

export function ExamResults({ isVerifying, examResult }: ExamResultsProps) {
  return (
    <Card className={`w-full ${examResult ? (examResult.passed ? "bg-green-100" : "bg-red-100") : ""}`}>
      <CardContent className="flex items-center justify-center p-6">
        {isVerifying ? (
          <div className="flex items-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2 text-gray-600" />
            <p className="text-gray-800 font-semibold">Verifying your exam results...</p>
          </div>
        ) : examResult ? (
          <div className="flex items-center">
            {examResult.passed ? (
              <CheckCircle className="h-8 w-8 text-green-500 mr-2" />
            ) : (
              <XCircle className="h-8 w-8 text-red-500 mr-2" />
            )}
            <h3 className={`text-2xl font-bold ${examResult.passed ? "text-green-800" : "text-red-800"}`}>
              {examResult.passed ? "Exam Passed" : "Exam Failed"}
            </h3>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

