import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Client, ClientPortalUser } from '../../lib/database.types';
import { Plus, Trash2, Eye, EyeOff, Users } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface PortalUserWithClient extends ClientPortalUser {
  client?: Client;
}

export function ClientPortalPage() {
  const { showToast } = useToast();
  const [portalUsers, setPortalUsers] = useState<PortalUserWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    email: '',
    full_name: '',
    password: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, clientsRes] = await Promise.all([
        supabase.from('client_portal_users').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').order('name'),
      ]);

      if (usersRes.data) {
        const usersWithClients = await Promise.all(
          usersRes.data.map(async (user) => {
            const { data: clientData } = await supabase
              .from('clients')
              .select('*')
              .eq('id', user.client_id)
              .single();
            return { ...user, client: clientData || undefined };
          })
        );
        setPortalUsers(usersWithClients);
      }

      if (clientsRes.data) setClients(clientsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/portal-users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          client_id: formData.client_id,
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create portal user');

      setShowModal(false);
      setFormData({ client_id: '', email: '', full_name: '', password: '' });
      loadData();
      showToast('Portal user created successfully', 'success');
    } catch (error: any) {
      console.error('Error creating portal user:', error);
      showToast(error.message || 'Failed to create portal user', 'error');
    }
  };

  const toggleUserStatus = async (user: ClientPortalUser) => {
    try {
      const { error } = await supabase
        .from('client_portal_users')
        .update({
          is_active: !user.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this portal user?')) return;

    try {
      const { error } = await supabase.from('client_portal_users').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center gap-4 flex-wrap animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Client Portal</h1>
          <p className="text-muted-foreground mt-1">Manage client-side user access</p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          data-testid="button-add-portal-user"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Portal User
        </Button>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
        <Card>
          <CardContent className="p-5">
            <div className="flex gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">About Client Portal</h3>
                <p className="text-sm text-muted-foreground">
                  Client portal users have read-only access to view their reports and performance data. They
                  cannot edit anything or view other clients' information.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portalUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/50 transition-colors" data-testid={`row-user-${user.id}`}>
                  <TableCell className="font-medium text-foreground" data-testid={`text-name-${user.id}`}>{user.full_name}</TableCell>
                  <TableCell className="text-muted-foreground" data-testid={`text-email-${user.id}`}>{user.email}</TableCell>
                  <TableCell className="text-foreground" data-testid={`text-client-${user.id}`}>{user.client?.name}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleUserStatus(user)}
                      className="p-0 h-auto"
                      data-testid={`button-toggle-status-${user.id}`}
                    >
                      {user.is_active ? (
                        <Badge variant="secondary" className="no-default-active-elevate">
                          <Eye className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="no-default-active-elevate">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(user.id)}
                      data-testid={`button-delete-user-${user.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {portalUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Users className="h-8 w-8 opacity-40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No portal users yet. Add your first portal user to get started.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Portal User</DialogTitle>
            <DialogDescription>Create a new portal user with client access.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="portal-client">Client</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              >
                <SelectTrigger data-testid="select-portal-client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="portal-full-name">Full Name</Label>
              <Input
                id="portal-full-name"
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                data-testid="input-portal-full-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="portal-email">Email</Label>
              <Input
                id="portal-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                data-testid="input-portal-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="portal-password">Password</Label>
              <Input
                id="portal-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                data-testid="input-portal-password"
              />
              <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                data-testid="button-cancel-portal-user"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-testid="button-create-portal-user"
              >
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
