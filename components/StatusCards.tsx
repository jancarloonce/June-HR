import { Card, CardContent } from "@/components/ui/card"

interface StatusCardsProps {
  examStage: string
}

export function StatusCards({ examStage }: StatusCardsProps) {
  return (
    <div className="mt-4 space-y-4">
      {examStage === "notStarted" && (
        <Card className="bg-gray-200 shadow-md">
          <CardContent>
            <p className="text-center text-gray-800 font-semibold">
              Say "Yes" or "Ready" to start the exam on website metrics and conversion rates
            </p>
          </CardContent>
        </Card>
      )}

      {examStage === "inProgress" && (
        <Card className="bg-gray-200 shadow-md">
          <CardContent>
            <p className="text-center text-gray-800 font-semibold">
              Exam in progress. Say "Done" or "Submit" when you've finished.
            </p>
          </CardContent>
        </Card>
      )}

      {examStage === "verifying" && (
        <Card className="bg-gray-200 shadow-md">
          <CardContent>
            <p className="text-center text-gray-800 font-semibold">Verifying your exam results...</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

