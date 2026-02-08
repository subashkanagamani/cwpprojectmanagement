import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '../lib/supabase';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Search, Users, UserCheck, FileText, CheckSquare, Command } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  industry: string | null;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface WeeklyReport {
  id: string;
  week_start_date: string;
  status: string;
  client: { name: string } | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
}

interface SearchResults {
  clients: Client[];
  profiles: Profile[];
  reports: WeeklyReport[];
  tasks: Task[];
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({
    clients: [],
    profiles: [],
    reports: [],
    tasks: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ clients: [], profiles: [], reports: [], tasks: [] });
      return;
    }

    const timer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async () => {
    setIsLoading(true);
    try {
      const searchTerm = `%${query}%`;

      const [clientsData, profilesData, reportsData, tasksData] = await Promise.all([
        supabase
          .from('clients')
          .select('id, name, industry')
          .ilike('name', searchTerm)
          .limit(5),
        supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .ilike('full_name', searchTerm)
          .limit(5),
        supabase
          .from('weekly_reports')
          .select('id, week_start_date, status, client:clients(name)')
          .or(`status.ilike.${searchTerm},week_start_date.ilike.${searchTerm}`)
          .limit(5) as any,
        supabase
          .from('tasks')
          .select('id, title, status')
          .ilike('title', searchTerm)
          .limit(5) as any,
      ]);

      setResults({
        clients: clientsData.data || [],
        profiles: profilesData.data || [],
        reports: reportsData.data || [],
        tasks: tasksData.data || [],
      });
    } catch (error) {
      console.error('Search error:', error);
      setResults({ clients: [], profiles: [], reports: [], tasks: [] });
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K on Mac, Ctrl+K on Windows
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      // Escape to close
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleResultClick = (path: string) => {
    setIsOpen(false);
    setQuery('');
    setLocation(path);
  };

  const hasResults =
    results.clients.length > 0 ||
    results.profiles.length > 0 ||
    results.reports.length > 0 ||
    results.tasks.length > 0;

  const showNoResults = !isLoading && query.trim() && !hasResults;

  return (
    <>
      {/* Keyboard shortcut indicator button */}
      <button
        onClick={() => setIsOpen(true)}
        data-testid="button-global-search-open"
        className="hidden md:flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-muted-foreground hover-elevate"
        title="Open global search (Cmd+K)"
      >
        <Search className="h-4 w-4" />
        <span>Search...</span>
        <kbd className="ml-auto rounded border border-border bg-background px-1.5 py-0.5 text-xs font-semibold">
          <Command className="inline h-3 w-3 mr-1" />K
        </kbd>
      </button>

      {/* Mobile search button */}
      <button
        onClick={() => setIsOpen(true)}
        data-testid="button-global-search-mobile"
        className="md:hidden p-1 hover-elevate"
      >
        <Search className="h-5 w-5 text-foreground" />
      </button>

      {/* Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[80vh] overflow-hidden p-0 shadow-2xl sm:rounded-lg">
          <div className="flex flex-col h-full">
            {/* Search Input */}
            <div className="border-b border-border p-4 sticky top-0">
              <div className="flex items-center gap-3">
                <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <Input
                  autoFocus
                  placeholder="Search clients, employees, reports, tasks..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  data-testid="input-global-search"
                  className="border-0 bg-transparent px-0 focus-visible:ring-0 text-base"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Use arrow keys to navigate, Enter to select, Esc to close
              </p>
            </div>

            {/* Results Container */}
            <div className="flex-1 overflow-y-auto">
              {isLoading && !query.trim() && (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-10 w-full rounded" />
                  <Skeleton className="h-10 w-full rounded" />
                  <Skeleton className="h-10 w-full rounded" />
                </div>
              )}

              {showNoResults && (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Search className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">No results found for "{query}"</p>
                </div>
              )}

              {!isLoading && query.trim() && hasResults && (
                <div className="divide-y divide-border">
                  {/* Clients Section */}
                  {results.clients.length > 0 && (
                    <div data-testid="section-clients">
                      <div className="sticky top-0 bg-muted/30 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5" />
                          Clients
                        </div>
                      </div>
                      <div className="space-y-1">
                        {results.clients.map((client) => (
                          <button
                            key={client.id}
                            onClick={() => handleResultClick(`/clients/${client.id}`)}
                            data-testid={`result-client-${client.id}`}
                            className="w-full text-left px-4 py-2.5 hover-elevate active-elevate-2 transition-colors rounded-none flex items-center justify-between gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {client.name}
                              </p>
                              {client.industry && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {client.industry}
                                </p>
                              )}
                            </div>
                            <Badge variant="secondary" className="flex-shrink-0">
                              Client
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Employees Section */}
                  {results.profiles.length > 0 && (
                    <div data-testid="section-employees">
                      <div className="sticky top-0 bg-muted/30 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-3.5 w-3.5" />
                          Employees
                        </div>
                      </div>
                      <div className="space-y-1">
                        {results.profiles.map((profile) => (
                          <button
                            key={profile.id}
                            onClick={() => handleResultClick('/employees')}
                            data-testid={`result-employee-${profile.id}`}
                            className="w-full text-left px-4 py-2.5 hover-elevate active-elevate-2 transition-colors rounded-none flex items-center justify-between gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {profile.full_name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {profile.email}
                              </p>
                            </div>
                            <Badge variant="secondary" className="flex-shrink-0">
                              {profile.role}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reports Section */}
                  {results.reports.length > 0 && (
                    <div data-testid="section-reports">
                      <div className="sticky top-0 bg-muted/30 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5" />
                          Reports
                        </div>
                      </div>
                      <div className="space-y-1">
                        {results.reports.map((report) => (
                          <button
                            key={report.id}
                            onClick={() => handleResultClick('/reports')}
                            data-testid={`result-report-${report.id}`}
                            className="w-full text-left px-4 py-2.5 hover-elevate active-elevate-2 transition-colors rounded-none flex items-center justify-between gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {report.client?.name || 'Unnamed Client'} Report
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {new Date(report.week_start_date).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant="secondary" className="flex-shrink-0">
                              {report.status}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tasks Section */}
                  {results.tasks.length > 0 && (
                    <div data-testid="section-tasks">
                      <div className="sticky top-0 bg-muted/30 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="h-3.5 w-3.5" />
                          Tasks
                        </div>
                      </div>
                      <div className="space-y-1">
                        {results.tasks.map((task) => (
                          <button
                            key={task.id}
                            onClick={() => handleResultClick('/tasks')}
                            data-testid={`result-task-${task.id}`}
                            className="w-full text-left px-4 py-2.5 hover-elevate active-elevate-2 transition-colors rounded-none flex items-center justify-between gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {task.title}
                              </p>
                              {task.status && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {task.status}
                                </p>
                              )}
                            </div>
                            <Badge variant="secondary" className="flex-shrink-0">
                              Task
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
