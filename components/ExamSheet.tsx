import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface ExamSheetProps {
  isSheetLoading: boolean
  onSheetLoad: () => void
}

export function ExamSheet({ isSheetLoading, onSheetLoad }: ExamSheetProps) {
  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle>Exam Sheet</CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-[calc(100%-4rem)]">
        {" "}
        {/* Adjust height to account for header */}
        <div className="relative w-full h-full">
          {isSheetLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
            </div>
          )}
          <iframe
            src="https://docs.google.com/spreadsheets/d/1UQkuSlYqaBqobS5-TTFrqxTKx_efMjAeFH1mSzcpi0c/edit?usp=sharing"
            className="w-full h-full border-none"
            allowFullScreen
            onLoad={onSheetLoad}
          />
        </div>
      </CardContent>
    </Card>
  )
}

