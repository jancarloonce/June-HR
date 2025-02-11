export const SkeletonLoader = () => {
  return (
    <div className="animate-pulse flex items-center justify-center space-x-4">
      <div className="w-16 h-16 rounded-full bg-gray-200"></div>
      <div className="w-32 h-4 rounded bg-gray-200"></div>
      <div className="w-48 h-4 rounded bg-gray-200"></div>
    </div>
  )
}

