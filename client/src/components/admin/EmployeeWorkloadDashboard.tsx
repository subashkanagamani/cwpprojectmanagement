import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import {
  Users,
  AlertTriangle,
  Briefcase,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Layers,
  UserCheck,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ClientAssignment {
  client_id: string;
  client_name: string;
  services: string[];
}

interface EmployeeWorkload {
  id: string;
  full_name: string;
  email: string;
  role: string;
  clients: ClientAssignment[];
  total_services: number;
  total_clients: number;
}

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600',
  'bg-rose-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-teal-600',
  'bg-pink-600', 'bg-orange-600',
];

const SERVICE_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  'Account Manager': { bg: 'bg-blue-50', text: 'text-blue-700', darkBg: 'dark:bg-blue-950/40', darkText: 'dark:text-blue-300' },
  'LinkedIn Outreach': { bg: 'bg-sky-50', text: 'text-sky-700', darkBg: 'dark:bg-sky-950/40', darkText: 'dark:text-sky-300' },
  'Email': { bg: 'bg-violet-50', text: 'text-violet-700', darkBg: 'dark:bg-violet-950/40', darkText: 'dark:text-violet-300' },
  'Content Creation': { bg: 'bg-emerald-50', text: 'text-emerald-700', darkBg: 'dark:bg-emerald-950/40', darkText: 'dark:text-emerald-300' },
  'Lead Sourcing': { bg: 'bg-amber-50', text: 'text-amber-700', darkBg: 'dark:bg-amber-950/40', darkText: 'dark:text-amber-300' },
  'Social Media': { bg: 'bg-pink-50', text: 'text-pink-700', darkBg: 'dark:bg-pink-950/40', darkText: 'dark:text-pink-300' },
  'SEO': { bg: 'bg-teal-50', text: 'text-teal-700', darkBg: 'dark:bg-teal-950/40', darkText: 'dark:text-teal-300' },
  'Paid Ads': { bg: 'bg-orange-50', text: 'text-orange-700', darkBg: 'dark:bg-orange-950/40', darkText: 'dark:text-orange-300' },
  'Designer': { bg: 'bg-indigo-50', text: 'text-indigo-700', darkBg: 'dark:bg-indigo-950/40', darkText: 'dark:text-indigo-300' },
  'Lead Filtration': { bg: 'bg-rose-50', text: 'text-rose-700', darkBg: 'dark:bg-rose-950/40', darkText: 'dark:text-rose-300' },
};

function getServiceStyle(serviceName: string) {
  return SERVICE_COLORS[serviceName] || { bg: 'bg-muted', text: 'text-muted-foreground', darkBg: 'dark:bg-muted', darkText: 'dark:text-muted-foreground' };
}

function getWorkloadLevel(totalServices: number, maxServices: number) {
  const ratio = totalServices / Math.max(maxServices, 1);
  if (ratio >= 0.7) return { label: 'High', variant: 'destructive' as const, color: 'text-red-600 dark:text-red-400' };
  if (ratio >= 0.4) return { label: 'Medium', variant: 'default' as const, color: 'text-amber-600 dark:text-amber-400' };
  return { label: 'Low', variant: 'secondary' as const, color: 'text-emerald-600 dark:text-emerald-400' };
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function EmployeeWorkloadDashboard() {
  const { showToast } = useToast();
  const [workloads, setWorkloads] = useState<EmployeeWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'clients' | 'services'>('services');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      type AssignmentRow = { employee_id: string; client_id: string; service_id: string };
      type ProfileRow = { id: string; full_name: string; email: string; role: string };
      type NamedRow = { id: string; name: string };

      const [aRes, pRes, cRes, sRes] = await Promise.all([
        supabase.from('client_assignments').select('employee_id, client_id, service_id'),
        supabase.from('profiles').select('id, full_name, email, role'),
        supabase.from('clients').select('id, name'),
        supabase.from('services').select('id, name'),
      ]);

      if (aRes.error) throw aRes.error;
      if (pRes.error) throw pRes.error;
      if (cRes.error) throw cRes.error;
      if (sRes.error) throw sRes.error;

      const assignmentsRaw = (aRes.data || []) as unknown as AssignmentRow[];
      const allProfiles = (pRes.data || []) as unknown as ProfileRow[];
      const allClients = (cRes.data || []) as unknown as NamedRow[];
      const allServices = (sRes.data || []) as unknown as NamedRow[];

      const clientLookup = new Map(allClients.map(c => [c.id, c.name]));
      const serviceLookup = new Map(allServices.map(s => [s.id, s.name]));

      const empMap = new Map<string, EmployeeWorkload>();

      for (const p of allProfiles) {
        empMap.set(p.id, {
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          role: p.role,
          clients: [],
          total_services: 0,
          total_clients: 0,
        });
      }

      for (const row of assignmentsRaw) {
        const emp = empMap.get(row.employee_id);
        if (!emp) continue;
        const clientName = clientLookup.get(row.client_id);
        const serviceName = serviceLookup.get(row.service_id);
        if (!clientName || !serviceName) continue;

        let clientEntry = emp.clients.find(c => c.client_id === row.client_id);
        if (!clientEntry) {
          clientEntry = { client_id: row.client_id, client_name: clientName, services: [] };
          emp.clients.push(clientEntry);
        }
        if (!clientEntry.services.includes(serviceName)) {
          clientEntry.services.push(serviceName);
        }
      }

      for (const emp of empMap.values()) {
        emp.total_clients = emp.clients.length;
        emp.total_services = emp.clients.reduce((sum, c) => sum + c.services.length, 0);
        emp.clients.sort((a, b) => b.services.length - a.services.length);
      }

      setWorkloads(Array.from(empMap.values()));
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const maxServices = useMemo(() => Math.max(...workloads.map(w => w.total_services), 1), [workloads]);
  const maxClients = useMemo(() => Math.max(...workloads.map(w => w.total_clients), 1), [workloads]);

  const summary = useMemo(() => {
    const total = workloads.length;
    let high = 0, medium = 0, low = 0;
    for (const w of workloads) {
      const level = getWorkloadLevel(w.total_services, maxServices);
      if (level.label === 'High') high++;
      else if (level.label === 'Medium') medium++;
      else low++;
    }
    const totalAssignments = workloads.reduce((s, w) => s + w.total_services, 0);
    const totalClients = new Set(workloads.flatMap(w => w.clients.map(c => c.client_id))).size;
    return { total, high, medium, low, totalAssignments, totalClients };
  }, [workloads, maxServices]);

  const sortedAndFiltered = useMemo(() => {
    let filtered = workloads;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = workloads.filter(w =>
        w.full_name.toLowerCase().includes(q) ||
        w.email.toLowerCase().includes(q) ||
        w.clients.some(c => c.client_name.toLowerCase().includes(q))
      );
    }
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.full_name.localeCompare(b.full_name);
      else if (sortBy === 'clients') cmp = a.total_clients - b.total_clients;
      else cmp = a.total_services - b.total_services;
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [workloads, searchQuery, sortBy, sortDir]);

  useEffect(() => {
    setExpandedCards(new Set());
  }, [searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    if (expandedCards.size === sortedAndFiltered.length) {
      setExpandedCards(new Set());
    } else {
      setExpandedCards(new Set(sortedAndFiltered.map(w => w.id)));
    }
  };

  const handleSort = (field: 'name' | 'clients' | 'services') => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Skeleton className="h-8 w-72 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground" data-testid="text-workload-title">
            Team Workload
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of each team member's client assignments and service responsibilities
          </p>
        </div>
        <Button variant="outline" onClick={loadData} data-testid="button-refresh-workload">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-stat-team">
          <CardContent className="flex items-center gap-3 p-6">
            <div className="rounded-lg p-2.5 bg-blue-50 dark:bg-blue-950/40">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{summary.total}</p>
              <p className="text-xs text-muted-foreground">Team Members</p>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-high">
          <CardContent className="flex items-center gap-3 p-6">
            <div className="rounded-lg p-2.5 bg-red-50 dark:bg-red-950/40">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{summary.high}</p>
              <p className="text-xs text-muted-foreground">High Workload</p>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-assignments">
          <CardContent className="flex items-center gap-3 p-6">
            <div className="rounded-lg p-2.5 bg-violet-50 dark:bg-violet-950/40">
              <Layers className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{summary.totalAssignments}</p>
              <p className="text-xs text-muted-foreground">Total Assignments</p>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-clients">
          <CardContent className="flex items-center gap-3 p-6">
            <div className="rounded-lg p-2.5 bg-emerald-50 dark:bg-emerald-950/40">
              <Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{summary.totalClients}</p>
              <p className="text-xs text-muted-foreground">Active Clients</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or client..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-workload"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground mr-1">Sort:</span>
          <Button
            variant={sortBy === 'services' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('services')}
            data-testid="button-sort-services"
          >
            Assignments {sortBy === 'services' && (sortDir === 'desc' ? <ChevronDown className="h-3 w-3 ml-1" /> : <ChevronUp className="h-3 w-3 ml-1" />)}
          </Button>
          <Button
            variant={sortBy === 'clients' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('clients')}
            data-testid="button-sort-clients"
          >
            Clients {sortBy === 'clients' && (sortDir === 'desc' ? <ChevronDown className="h-3 w-3 ml-1" /> : <ChevronUp className="h-3 w-3 ml-1" />)}
          </Button>
          <Button
            variant={sortBy === 'name' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('name')}
            data-testid="button-sort-name"
          >
            Name {sortBy === 'name' && (sortDir === 'desc' ? <ChevronDown className="h-3 w-3 ml-1" /> : <ChevronUp className="h-3 w-3 ml-1" />)}
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={expandAll} data-testid="button-expand-all">
          {expandedCards.size === sortedAndFiltered.length ? 'Collapse All' : 'Expand All'}
        </Button>
      </div>

      {sortedAndFiltered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No team members found matching your search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedAndFiltered.map((emp, index) => {
            const level = getWorkloadLevel(emp.total_services, maxServices);
            const isExpanded = expandedCards.has(emp.id);
            const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
            const capacityPercent = Math.round((emp.total_services / maxServices) * 100);

            return (
              <Collapsible key={emp.id} open={isExpanded} onOpenChange={() => toggleExpand(emp.id)}>
                <Card className="overflow-visible" data-testid={`card-employee-${emp.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3 flex-wrap">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={`${avatarColor} text-white text-sm font-medium`}>
                          {getInitials(emp.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-sm font-semibold truncate" data-testid={`text-employee-name-${emp.id}`}>
                            {emp.full_name}
                          </CardTitle>
                          {emp.role === 'admin' && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Admin</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{emp.email}</p>
                      </div>
                      <Badge
                        variant={level.variant}
                        className="text-[11px] shrink-0"
                        data-testid={`badge-workload-${emp.id}`}
                      >
                        {level.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-2 rounded-md bg-muted/50">
                        <p className="text-lg font-semibold" data-testid={`text-client-count-${emp.id}`}>{emp.total_clients}</p>
                        <p className="text-[11px] text-muted-foreground">Clients</p>
                      </div>
                      <div className="text-center p-2 rounded-md bg-muted/50">
                        <p className="text-lg font-semibold" data-testid={`text-service-count-${emp.id}`}>{emp.total_services}</p>
                        <p className="text-[11px] text-muted-foreground">Assignments</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                        <span className="text-[11px] text-muted-foreground">Capacity Usage</span>
                        <span className={`text-[11px] font-medium ${level.color}`}>{capacityPercent}%</span>
                      </div>
                      <Progress value={capacityPercent} className="h-1.5" />
                    </div>

                    {emp.clients.length > 0 && (
                      <div>
                        <div className="flex flex-wrap gap-1 mb-1">
                          {emp.clients.slice(0, isExpanded ? undefined : 3).map(c => (
                            <Badge key={c.client_id} variant="outline" className="text-[10px] font-normal">
                              {c.client_name}
                              <span className="ml-1 text-muted-foreground">({c.services.length})</span>
                            </Badge>
                          ))}
                          {!isExpanded && emp.clients.length > 3 && (
                            <Badge variant="secondary" className="text-[10px]">
                              +{emp.clients.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full" data-testid={`button-expand-${emp.id}`}>
                        {isExpanded ? (
                          <>Hide Details <ChevronUp className="h-3 w-3 ml-1" /></>
                        ) : (
                          <>View Details <ChevronDown className="h-3 w-3 ml-1" /></>
                        )}
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="space-y-2">
                      <div className="border-t pt-3 space-y-2.5">
                        {emp.clients.map(client => (
                          <div key={client.client_id} className="rounded-md border p-3 space-y-2" data-testid={`card-client-${client.client_id}-${emp.id}`}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm font-medium truncate" data-testid={`text-client-name-${client.client_id}-${emp.id}`}>{client.client_name}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {client.services.map(svc => {
                                const style = getServiceStyle(svc);
                                return (
                                  <span
                                    key={svc}
                                    className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-md ${style.bg} ${style.text} ${style.darkBg} ${style.darkText}`}
                                  >
                                    {svc}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        {emp.clients.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">No client assignments yet</p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </CardContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Service Legend</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SERVICE_COLORS).map(([name, style]) => (
              <span
                key={name}
                className={`inline-block text-[11px] font-medium px-2.5 py-1 rounded-md ${style.bg} ${style.text} ${style.darkBg} ${style.darkText}`}
                data-testid={`legend-service-${name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {name}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
