import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ActivityLog, Profile } from '../../lib/database.types';
import { Clock, User, FileText, Download } from 'lucide-react';
import { exportToCSV } from '../../utils/exportData';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ActivityLogWithUser extends ActivityLog {
  user?: Profile;
}

export function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLogWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const { data: logsData, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          profiles(*)
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      if (logsData) {
        const logsWithUsers = logsData.map((log: any) => ({
          ...log,
          user: log.profiles || undefined,
        }));
        setLogs(logsWithUsers);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (filterEntity !== 'all' && log.entity_type !== filterEntity) return false;
    if (searchTerm && !JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleExport = () => {
    const exportData = filteredLogs.map((log) => ({
      timestamp: new Date(log.created_at).toLocaleString(),
      user: log.user?.full_name || 'System',
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      ip_address: log.ip_address,
    }));
    exportToCSV(exportData, `activity_logs_${new Date().toISOString().split('T')[0]}`);
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'default' as const;
      case 'UPDATE':
        return 'secondary' as const;
      case 'DELETE':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Activity Logs</h1>
          <p className="text-sm text-muted-foreground">Audit trail of all system activities</p>
        </div>
        <Button data-testid="button-export-logs" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export Logs
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="mb-2 block">Search</Label>
              <Input
                data-testid="input-search-logs"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search logs..."
              />
            </div>

            <div>
              <Label className="mb-2 block">Action</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger data-testid="select-filter-action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="INSERT">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Entity Type</Label>
              <Select value={filterEntity} onValueChange={setFilterEntity}>
                <SelectTrigger data-testid="select-filter-entity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="clients">Clients</SelectItem>
                  <SelectItem value="profiles">Employees</SelectItem>
                  <SelectItem value="client_assignments">Assignments</SelectItem>
                  <SelectItem value="weekly_reports">Reports</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted z-10">
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {log.user?.full_name || 'System'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action)} className="no-default-hover-elevate no-default-active-elevate">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {log.entity_type}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.ip_address || '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      No activity logs found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground text-center" data-testid="text-log-count">
        Showing {filteredLogs.length} of {logs.length} logs
      </p>
    </div>
  );
}
