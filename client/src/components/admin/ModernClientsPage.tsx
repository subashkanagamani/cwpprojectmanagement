import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { Plus, Search, MoreHorizontal, ArrowUpRight, TrendingUp, Users, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Client {
  id: string;
  name: string;
  industry: string | null;
  status: string;
  priority: string;
  health_status: string;
  health_score: number | null;
}

export function ModernClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [, setLocation] = useLocation();
  const { showToast } = useToast();

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.industry?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = [
    {
      label: 'Total Clients',
      value: clients.length,
      change: '+12%',
      icon: Users,
      color: 'blue',
    },
    {
      label: 'Active',
      value: clients.filter(c => c.status === 'active').length,
      change: '+8%',
      icon: TrendingUp,
      color: 'green',
    },
    {
      label: 'At Risk',
      value: clients.filter(c => c.health_status === 'at_risk').length,
      change: '-5%',
      icon: ArrowUpRight,
      color: 'orange',
    },
  ];

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'needs_attention':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400';
      case 'at_risk':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getIconBg = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-50 dark:bg-blue-950/30';
      case 'green': return 'bg-green-50 dark:bg-green-950/30';
      case 'orange': return 'bg-orange-50 dark:bg-orange-950/30';
      default: return 'bg-blue-50 dark:bg-blue-950/30';
    }
  };

  const getIconColor = (color: string) => {
    switch (color) {
      case 'blue': return 'text-blue-600 dark:text-blue-400';
      case 'green': return 'text-green-600 dark:text-green-400';
      case 'orange': return 'text-orange-600 dark:text-orange-400';
      default: return 'text-blue-600 dark:text-blue-400';
    }
  };

  const handleViewDetails = (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocation(`/clients/${clientId}`);
  };

  const handleEdit = (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    showToast('Edit functionality coming soon', 'info');
  };

  const handleDelete = async (clientId: string, clientName: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete "${clientName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      showToast(`${clientName} deleted successfully`, 'success');
      loadClients();
    } catch (error: any) {
      showToast(error.message || 'Failed to delete client', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-20 mb-3" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-12 w-12 rounded-full mb-4" />
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-6 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-up flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor all your clients
          </p>
        </div>
        <Button className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      <div className="animate-fade-up grid grid-cols-1 md:grid-cols-3 gap-5" style={{ animationDelay: "100ms" }}>
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className={`stat-card-gradient ${stat.color}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <Badge
                      variant="secondary"
                      className="mt-2 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-[11px]"
                    >
                      {stat.change}
                    </Badge>
                  </div>
                  <div className={`p-3 rounded-lg ${getIconBg(stat.color)}`}>
                    <Icon className={`h-6 w-6 ${getIconColor(stat.color)}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="animate-fade-up grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" style={{ animationDelay: "300ms" }}>
        {filteredClients.map((client) => (
          <Card
            key={client.id}
            className="hover:shadow-md transition-all cursor-pointer group"
            onClick={() => setLocation(`/clients/${client.id}`)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${client.name}`} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {getInitials(client.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => handleViewDetails(client.id, e)}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleEdit(client.id, e)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => handleDelete(client.id, client.name, e)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              <h3 className="font-semibold text-lg text-foreground mb-1">{client.name}</h3>
              {client.industry && (
                <p className="text-sm text-muted-foreground mb-3">{client.industry}</p>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary" className={`${getHealthColor(client.health_status)} text-[11px]`}>
                  {client.health_status === 'healthy'
                    ? 'Healthy'
                    : client.health_status === 'needs_attention'
                    ? 'Needs Attention'
                    : client.health_status === 'at_risk'
                    ? 'At Risk'
                    : 'Unknown'}
                </Badge>
                <Badge variant="secondary" className={`${getPriorityColor(client.priority)} text-[11px]`}>
                  {client.priority.charAt(0).toUpperCase() + client.priority.slice(1)}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm pt-3 border-t">
                <span className="text-muted-foreground">
                  {client.status === 'active' ? 'Active' : client.status === 'paused' ? 'Paused' : 'Completed'}
                </span>
                {client.health_score && (
                  <span className="font-medium text-foreground">
                    Score: {client.health_score}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="h-8 w-8 opacity-40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No clients found</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
