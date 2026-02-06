import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface ClientHealthIndicatorProps {
  healthStatus: 'healthy' | 'needs_attention' | 'at_risk' | string;
  healthScore?: number;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ClientHealthIndicator({
  healthStatus,
  healthScore,
  showScore = false,
  size = 'md',
  showLabel = true
}: ClientHealthIndicatorProps) {
  const getHealthConfig = (status: string) => {
    switch (status) {
      case 'healthy':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          label: 'Healthy',
          emoji: '🟢'
        };
      case 'needs_attention':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          label: 'Needs Attention',
          emoji: '🟡'
        };
      case 'at_risk':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          label: 'High Risk',
          emoji: '🔴'
        };
      default:
        return {
          icon: CheckCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          label: 'Unknown',
          emoji: '⚪'
        };
    }
  };

  const config = getHealthConfig(healthStatus);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center justify-center ${config.bgColor} rounded-full p-1.5`}>
        <Icon className={`${sizeClasses[size]} ${config.color}`} />
      </div>
      {showLabel && (
        <div className="flex items-center gap-2">
          <span className={`font-medium ${config.color} ${textSizeClasses[size]}`}>
            {config.label}
          </span>
          {showScore && healthScore !== undefined && (
            <span className={`${textSizeClasses[size]} text-gray-600`}>
              ({healthScore}/100)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
