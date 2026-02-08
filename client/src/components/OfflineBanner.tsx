import { useState, useEffect } from "react"
import { WifiOff, CheckCircle } from "lucide-react"

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true)
  const [showBackOnline, setShowBackOnline] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowBackOnline(true)
      const timer = setTimeout(() => {
        setShowBackOnline(false)
      }, 3000)
      return () => clearTimeout(timer)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowBackOnline(false)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (isOnline && !showBackOnline) {
    return null
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-yellow-600 dark:bg-yellow-700 text-yellow-50"
      data-testid="banner-offline"
    >
      <div className="flex items-center gap-3 px-4 py-3 max-w-screen-xl mx-auto">
        {showBackOnline ? (
          <>
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">Back online!</span>
          </>
        ) : (
          <>
            <WifiOff className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">
              You're offline. Some features may not work until you reconnect.
            </span>
          </>
        )}
      </div>
    </div>
  )
}
