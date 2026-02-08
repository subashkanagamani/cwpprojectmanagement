import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
          iconColor: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-950/40',
          label: 'Healthy',
          badgeClass: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800',
        };
      case 'needs_attention':
        return {
          icon: AlertTriangle,
          iconColor: 'text-amber-600 dark:text-amber-400',
          bgColor: 'bg-amber-50 dark:bg-amber-950/40',
          label: 'Needs Attention',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
        };
      case 'at_risk':
        return {
          icon: AlertCircle,
          iconColor: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-950/40',
          label: 'High Risk',
          badgeClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
        };
      default:
        return {
          icon: CheckCircle,
          iconColor: 'text-muted-foreground',
          bgColor: 'bg-muted',
          label: 'Unknown',
          badgeClass: '',
        };
    }
  };

  const config = getHealthConfig(healthStatus);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={`${config.badgeClass} no-default-active-elevate gap-1.5`}>
        <Icon className={`${sizeClasses[size]} ${config.iconColor}`} />
        {showLabel && (
          <span>{config.label}</span>
        )}
        {showScore && healthScore !== undefined && (
          <span className="opacity-70">{healthScore}/100</span>
        )}
      </Badge>
    </div>
  );
}
