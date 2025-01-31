import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

interface ExamResultsProps {
  isVerifying: boolean
  examResult: {
    passed: boolean
    score: number
    totalQuestions: number
    correctAnswers: number
    feedback: string[]
  } | null
}

export function ExamResults({ isVerifying, examResult }: ExamResultsProps) {
  return (
    <Card
      className={`w-full ${examResult ? (examResult.passed ? "border-l-4 border-green-500" : "border-l-4 border-red-500") : ""}`}
    >
      <CardHeader>
        <CardTitle>Exam Results</CardTitle>
      </CardHeader>
      <CardContent>
        {isVerifying ? (
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2 text-gray-600" />
            <p className="text-gray-800 font-semibold">Verifying your exam results...</p>
          </div>
        ) : (
          examResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                {examResult.passed ? (
                  <CheckCircle className="h-12 w-12 text-green-500 mr-2" />
                ) : (
                  <XCircle className="h-12 w-12 text-red-500 mr-2" />
                )}
                <h3 className={`text-2xl font-bold ${examResult.passed ? "text-green-800" : "text-red-800"}`}>
                  {examResult.passed ? "Exam Passed" : "Exam Failed"}
                </h3>
              </div>
              <p className="text-center text-lg text-gray-700">
                Score: {examResult.score.toFixed(2)}% ({examResult.correctAnswers} / {examResult.totalQuestions}{" "}
                correct)
              </p>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Feedback:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {examResult.feedback.map((item, index) => (
                    <li key={index} className="text-gray-700">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        )}
      </CardContent>
    </Card>
  )
}

