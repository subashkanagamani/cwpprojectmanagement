import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';

interface AvatarGroupProps {
  avatars: Array<{
    name: string;
    image?: string;
    email?: string;
  }>;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  onInvite?: () => void;
}

export function AvatarGroup({ avatars, max = 4, size = 'md', onInvite }: AvatarGroupProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayAvatars = avatars.slice(0, max);
  const remaining = Math.max(0, avatars.length - max);

  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-orange-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
  ];

  return (
    <div className="flex items-center">
      <div className="flex items-center -space-x-2">
        {displayAvatars.map((avatar, idx) => (
          <Avatar
            key={idx}
            className={`${sizeClasses[size]} border-2 border-white dark:border-gray-800 hover:z-10 transition-all hover:scale-110 cursor-pointer`}
            title={avatar.name}
          >
            <AvatarImage src={avatar.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatar.email || avatar.name}`} />
            <AvatarFallback className={`${colors[idx % colors.length]} text-white`}>
              {getInitials(avatar.name)}
            </AvatarFallback>
          </Avatar>
        ))}
        {remaining > 0 && (
          <div
            className={`${sizeClasses[size]} rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors`}
            title={`${remaining} more`}
          >
            +{remaining}
          </div>
        )}
      </div>
      {onInvite && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-2 h-8 gap-1 text-primary hover:text-primary hover:bg-primary/10"
          onClick={onInvite}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Invite</span>
        </Button>
      )}
    </div>
  );
}
