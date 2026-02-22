import { useState } from 'react';
import { Button } from '../ui/button';
import { KanbanBoard } from '../KanbanBoard';
import { ProjectHeader } from '../ProjectHeader';
import { Grid2X2 } from 'lucide-react';

export function ModernProjectsPage() {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  const projectTeam = [
    { name: 'John Doe', email: 'john@example.com' },
    { name: 'Jane Smith', email: 'jane@example.com' },
    { name: 'Bob Johnson', email: 'bob@example.com' },
    { name: 'Alice Williams', email: 'alice@example.com' },
    { name: 'Charlie Brown', email: 'charlie@example.com' },
  ];

  const kanbanData = {
    columns: [
      {
        id: 'todo',
        title: 'To Do',
        color: 'blue',
        cards: [
          {
            title: 'Brainstorming',
            description: "Brainstorming brings team members' diverse experience into play.",
            priority: 'low' as const,
            comments: 12,
            files: 0,
            avatars: [
              'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
              'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
              'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
            ],
          },
          {
            title: 'Research',
            description: 'User research helps you to create an optimal product for users.',
            priority: 'high' as const,
            comments: 10,
            files: 3,
            avatars: [
              'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
              'https://api.dicebear.com/7.x/avataaars/svg?seed=5',
            ],
          },
          {
            title: 'Wireframes',
            description: 'Low fidelity wireframes include the most basic content and visuals.',
            comments: 8,
            files: 3,
            avatars: [
              'https://api.dicebear.com/7.x/avataaars/svg?seed=6',
              'https://api.dicebear.com/7.x/avataaars/svg?seed=7',
              'https://api.dicebear.com/7.x/avataaars/svg?seed=8',
            ],
          },
        ],
      },
      {
        id: 'progress',
        title: 'On Progress',
        color: 'orange',
        cards: [
          {
            title: 'Onboarding Illustrations',
            images: [
              'https://images.pexels.com/photos/1591447/pexels-photo-1591447.jpeg?auto=compress&cs=tinysrgb&w=300',
              'https://images.pexels.com/photos/1629236/pexels-photo-1629236.jpeg?auto=compress&cs=tinysrgb&w=300',
            ],
            priority: 'low' as const,
            comments: 14,
            files: 15,
            avatars: [
              'https://api.dicebear.com/7.x/avataaars/svg?seed=9',
              'https://api.dicebear.com/7.x/avataaars/svg?seed=10',
              'https://api.dicebear.com/7.x/avataaars/svg?seed=11',
            ],
          },
          {
            title: 'Moodboard',
            images: [
              'https://images.pexels.com/photos/1591056/pexels-photo-1591056.jpeg?auto=compress&cs=tinysrgb&w=300',
              'https://images.pexels.com/photos/1574927/pexels-photo-1574927.jpeg?auto=compress&cs=tinysrgb&w=300',
              'https://images.pexels.com/photos/1407322/pexels-photo-1407322.jpeg?auto=compress&cs=tinysrgb&w=300',
            ],
            priority: 'low' as const,
            comments: 9,
            files: 10,
            avatars: [
              'https://api.dicebear.com/7.x/avataaars/svg?seed=12',
            ],
          },
        ],
      },
      {
        id: 'done',
        title: 'Done',
        color: 'green',
        cards: [
          {
            title: 'Mobile App Design',
            images: [
              'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&w=300',
              'https://images.pexels.com/photos/887751/pexels-photo-887751.jpeg?auto=compress&cs=tinysrgb&w=300',
              'https://images.pexels.com/photos/1092671/pexels-photo-1092671.jpeg?auto=compress&cs=tinysrgb&w=300',
            ],
            status: 'completed',
            comments: 12,
            files: 15,
            avatars: [
              'https://api.dicebear.com/7.x/avataaars/svg?seed=13',
              'https://api.dicebear.com/7.x/avataaars/svg?seed=14',
            ],
          },
          {
            title: 'Design System',
            description: 'It just needs to adapt the UI from what you did before',
            status: 'completed',
            comments: 12,
            files: 15,
            avatars: [
              'https://api.dicebear.com/7.x/avataaars/svg?seed=15',
              'https://api.dicebear.com/7.x/avataaars/svg?seed=16',
              'https://api.dicebear.com/7.x/avataaars/svg?seed=17',
            ],
          },
        ],
      },
    ],
  };

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-foreground">Projects</h1>
        <p className="text-muted-foreground mt-1">Manage and track your project progress</p>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
        <ProjectHeader
          title="Mobile App"
          description="Modern mobile application development project"
          team={projectTeam}
          status="active"
          onInvite={() => console.log('Invite clicked')}
        />
      </div>

      <div className="flex justify-end animate-fade-up" style={{ animationDelay: "200ms" }}>
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('kanban')}
            className="gap-2"
          >
            <Grid2X2 className="h-4 w-4" />
            <span className="hidden sm:inline">Board</span>
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="hidden sm:inline">List</span>
          </Button>
        </div>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "300ms" }}>
        <KanbanBoard
          columns={kanbanData.columns}
          onCardClick={(columnId, cardIndex) => {
            console.log('Card clicked:', columnId, cardIndex);
          }}
          onAddCard={(columnId) => {
            console.log('Add card to column:', columnId);
          }}
        />
      </div>
    </div>
  );
}
