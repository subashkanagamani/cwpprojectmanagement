import { AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  retrying?: boolean
  fullPage?: boolean
}

export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred. Please try again.",
  onRetry,
  retrying = false,
  fullPage = false,
}: ErrorStateProps) {
  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {title}
                </h2>
                <p className="text-sm text-muted-foreground">{message}</p>
              </div>
              {onRetry && (
                <Button
                  onClick={onRetry}
                  disabled={retrying}
                  data-testid="button-retry"
                >
                  {retrying ? "Retrying..." : "Try again"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex gap-4">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                disabled={retrying}
                className="mt-3"
                data-testid="button-retry"
              >
                {retrying ? "Retrying..." : "Try again"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
