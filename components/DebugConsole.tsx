import { Card, CardContent } from "@/components/ui/card"

interface DebugConsoleProps {
  debug: string
}

export function DebugConsole({ debug }: DebugConsoleProps) {
  return (
    <Card className="bg-white shadow-md mt-4">
      <CardContent>
        <h3 className="text-lg font-bold mb-2 text-gray-800">Debug Console</h3>
        <div className="bg-gray-100 p-4 rounded-lg max-h-48 overflow-y-auto">
          <p className="font-mono text-sm text-gray-600 whitespace-pre-wrap">{debug}</p>
        </div>
      </CardContent>
    </Card>
  )
}

