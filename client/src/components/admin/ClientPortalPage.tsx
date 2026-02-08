import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Client, ClientPortalUser } from '../../lib/database.types';
import { Plus, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: portalError } = await supabase.from('client_portal_users').insert({
          client_id: formData.client_id,
          email: formData.email,
          full_name: formData.full_name,
          auth_user_id: authData.user.id,
          is_active: true,
        });

        if (portalError) throw portalError;
      }

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
      <div className="space-y-6">
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
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Client Portal</h1>
          <p className="text-sm text-muted-foreground">Manage client-side user access</p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          data-testid="button-add-portal-user"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Portal User
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-2">About Client Portal</h3>
          <p className="text-sm text-muted-foreground">
            Client portal users have read-only access to view their reports and performance data. They
            cannot edit anything or view other clients' information.
          </p>
        </CardContent>
      </Card>

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
              <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
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
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  No portal users yet. Add your first portal user to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

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
