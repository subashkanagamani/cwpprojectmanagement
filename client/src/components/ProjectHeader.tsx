import { Button } from './ui/button';
import { AvatarGroup } from './AvatarGroup';
import { Badge } from './ui/badge';
import { Link as LinkIcon, Share, Calendar, Filter, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface ProjectHeaderProps {
  title: string;
  description?: string;
  team?: Array<{
    name: string;
    email?: string;
    image?: string;
  }>;
  onInvite?: () => void;
  status?: 'active' | 'paused' | 'completed';
}

export function ProjectHeader({
  title,
  description,
  team = [],
  onInvite,
  status = 'active'
}: ProjectHeaderProps) {
  const statusColors = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    paused: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold text-foreground">{title}</h1>
            <Badge className={statusColors[status]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <LinkIcon className="h-4 w-4" />
            <span>Project Dashboard</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" className="gap-2">
            <LinkIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Copy Link</span>
          </Button>
          {team.length > 0 && (
            <AvatarGroup
              avatars={team}
              max={4}
              onInvite={onInvite}
            />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                <span>Filter</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>All Items</DropdownMenuItem>
              <DropdownMenuItem>Assigned to Me</DropdownMenuItem>
              <DropdownMenuItem>High Priority</DropdownMenuItem>
              <DropdownMenuItem>Due Today</DropdownMenuItem>
              <DropdownMenuItem>Overdue</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                <span>Today</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Today</DropdownMenuItem>
              <DropdownMenuItem>This Week</DropdownMenuItem>
              <DropdownMenuItem>This Month</DropdownMenuItem>
              <DropdownMenuItem>Custom Range</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Share className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
