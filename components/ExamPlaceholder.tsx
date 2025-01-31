import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileSpreadsheet } from "lucide-react"

export function ExamPlaceholder() {
  return (
    <Card className="w-full h-full flex flex-col justify-center items-center">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-gray-700">Exam Sheet</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <FileSpreadsheet className="w-24 h-24 text-gray-400 mb-4 mx-auto" />
        <p className="text-lg text-gray-600 mb-2">The exam sheet will appear here when you're ready to begin.</p>
        <p className="text-sm text-gray-500">Say "Yes" or "Ready" when prompted to start the exam.</p>
      </CardContent>
    </Card>
  )
}

