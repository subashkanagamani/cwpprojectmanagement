import { Calendar, Clock, AlertCircle } from 'lucide-react';

interface MeetingUrgencyBadgeProps {
  daysUntilMeeting: number;
  urgencyLabel: string;
  meetingDay?: string;
  meetingTime?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function MeetingUrgencyBadge({
  daysUntilMeeting,
  urgencyLabel,
  meetingDay,
  meetingTime,
  size = 'md',
  showIcon = true
}: MeetingUrgencyBadgeProps) {
  const getDayName = (dayNum: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum] || '';
  };

  const getUrgencyConfig = (days: number) => {
    if (days === 0) {
      return {
        bgColor: 'bg-red-100 border-red-300',
        textColor: 'text-red-800',
        iconColor: 'text-red-600',
        icon: AlertCircle,
        emoji: '🔥'
      };
    } else if (days === 1) {
      return {
        bgColor: 'bg-orange-100 border-orange-300',
        textColor: 'text-orange-800',
        iconColor: 'text-orange-600',
        icon: Clock,
        emoji: '⚡'
      };
    } else if (days <= 3) {
      return {
        bgColor: 'bg-yellow-100 border-yellow-300',
        textColor: 'text-yellow-800',
        iconColor: 'text-yellow-600',
        icon: Calendar,
        emoji: '📅'
      };
    } else {
      return {
        bgColor: 'bg-gray-100 border-gray-300',
        textColor: 'text-gray-600',
        iconColor: 'text-gray-500',
        icon: Calendar,
        emoji: '📆'
      };
    }
  };

  const config = getUrgencyConfig(daysUntilMeeting);
  const Icon = config.icon;

  const sizeClasses = {
    sm: { badge: 'px-2 py-0.5 text-xs', icon: 'h-3 w-3' },
    md: { badge: 'px-3 py-1 text-sm', icon: 'h-4 w-4' },
    lg: { badge: 'px-4 py-2 text-base', icon: 'h-5 w-5' }
  };

  if (daysUntilMeeting >= 999) {
    return null;
  }

  return (
    <div className={`inline-flex items-center gap-1.5 ${config.bgColor} ${config.textColor} ${sizeClasses[size].badge} rounded-full border font-medium`}>
      {showIcon && <Icon className={`${sizeClasses[size].icon} ${config.iconColor}`} />}
      <span>{urgencyLabel}</span>
      {daysUntilMeeting <= 1 && (
        <span className="font-bold">{config.emoji}</span>
      )}
    </div>
  );
}
