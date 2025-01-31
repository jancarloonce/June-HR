import { Loader2 } from "lucide-react"

export const SkeletonLoader = () => {
  return (
    <div className="w-full h-full bg-gray-100 animate-pulse flex flex-col items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-gray-400 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
    </div>
  )
}

