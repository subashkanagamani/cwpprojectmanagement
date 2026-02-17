import { ReactNode, useState } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { MoreHorizontal, MessageSquare, Paperclip, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface KanbanCardProps {
  title: string;
  description?: string;
  priority?: 'low' | 'high';
  status?: string;
  comments?: number;
  files?: number;
  images?: string[];
  avatars?: string[];
  onClick?: () => void;
}

export function KanbanCard({
  title,
  description,
  priority,
  status,
  comments,
  files,
  images,
  avatars = [],
  onClick,
}: KanbanCardProps) {
  const priorityColors = {
    low: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
    high: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  };

  const statusColors = {
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  };

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-wrap gap-2">
          {priority && (
            <Badge variant="secondary" className={`text-xs font-medium ${priorityColors[priority]}`}>
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </Badge>
          )}
          {status && (
            <Badge variant="secondary" className={`text-xs font-medium ${statusColors[status as keyof typeof statusColors]}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Delete</DropdownMenuItem>
            <DropdownMenuItem>Move to...</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{description}</p>
      )}

      {images && images.length > 0 && (
        <div className={`grid gap-2 mb-3 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {images.map((image, idx) => (
            <div
              key={idx}
              className="aspect-square rounded-lg bg-cover bg-center"
              style={{ backgroundImage: `url(${image})` }}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-1">
          {avatars.slice(0, 3).map((avatar, idx) => (
            <Avatar key={idx} className="h-6 w-6 border-2 border-white dark:border-gray-800 -ml-1 first:ml-0">
              <AvatarImage src={avatar} />
              <AvatarFallback className="text-xs">U{idx + 1}</AvatarFallback>
            </Avatar>
          ))}
          {avatars.length > 3 && (
            <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium -ml-1">
              +{avatars.length - 3}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-muted-foreground">
          {comments !== undefined && (
            <div className="flex items-center gap-1 text-xs">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{comments}</span>
            </div>
          )}
          {files !== undefined && (
            <div className="flex items-center gap-1 text-xs">
              <Paperclip className="h-3.5 w-3.5" />
              <span>{files}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

interface KanbanColumnProps {
  title: string;
  count: number;
  color: string;
  children: ReactNode;
  onAddCard?: () => void;
}

export function KanbanColumn({ title, count, color, children, onAddCard }: KanbanColumnProps) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500',
    orange: 'bg-orange-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="flex-shrink-0 w-80 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${colorClasses[color] || 'bg-gray-500'}`} />
          <h2 className="font-semibold text-foreground">{title}</h2>
          <Badge variant="secondary" className="text-xs">
            {count}
          </Badge>
        </div>
        {onAddCard && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onAddCard}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto pb-4">
        {children}
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  columns: Array<{
    id: string;
    title: string;
    color: string;
    cards: Array<KanbanCardProps>;
  }>;
  onCardClick?: (columnId: string, cardIndex: number) => void;
  onAddCard?: (columnId: string) => void;
}

export function KanbanBoard({ columns, onCardClick, onAddCard }: KanbanBoardProps) {
  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {columns.map((column) => (
        <KanbanColumn
          key={column.id}
          title={column.title}
          count={column.cards.length}
          color={column.color}
          onAddCard={onAddCard ? () => onAddCard(column.id) : undefined}
        >
          {column.cards.map((card, idx) => (
            <KanbanCard
              key={idx}
              {...card}
              onClick={() => onCardClick?.(column.id, idx)}
            />
          ))}
        </KanbanColumn>
      ))}
    </div>
  );
}
