import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Key,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Building2,
  Trash2,
  Edit,
  Shield,
  AlertTriangle,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Credential {
  id: string;
  client_id: string;
  tool_name: string;
  username: string;
  encrypted_password: string;
  notes: string;
  created_at: string;
  updated_at: string;
  clients: {
    id: string;
    name: string;
  };
}

interface ClientGroup {
  clientId: string;
  clientName: string;
  credentials: Credential[];
}

export function ClientCredentialsPage() {
  const { showToast } = useToast();
  const { profile } = useAuth();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [credentialForm, setCredentialForm] = useState({
    client_id: '',
    tool_name: '',
    username: '',
    password: '',
    notes: '',
  });

  const isAdmin = profile?.role === 'admin';
  const canEdit = isAdmin;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [
        { data: credentialsData, error: credError },
        { data: clientsData, error: clientsError }
      ] = await Promise.all([
        supabase
          .from('client_credentials')
          .select('*, clients(id, name)')
          .order('created_at', { ascending: false }),
        isAdmin
          ? supabase.from('clients').select('id, name').eq('status', 'active').order('name')
          : supabase
              .from('client_assignments')
              .select('client_id, clients(id, name)')
              .eq('employee_id', profile?.id || '')
              .then(({ data, error }) => {
                if (error) return { data: null, error };
                const uniqueClients = data
                  ?.map((item: any) => item.clients)
                  .filter((client: any, index: number, self: any[]) =>
                    client && self.findIndex((c: any) => c?.id === client?.id) === index
                  );
                return { data: uniqueClients, error: null };
              }),
      ]);

      if (credError) throw credError;
      if (clientsError) throw clientsError;

      setCredentials(credentialsData || []);
      setClients(clientsData || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const encryptPassword = (password: string): string => {
    return btoa(password);
  };

  const decryptPassword = (encryptedPassword: string): string => {
    try {
      return atob(encryptedPassword);
    } catch {
      return '';
    }
  };

  const togglePasswordVisibility = (credentialId: string) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(credentialId)) {
      newVisible.delete(credentialId);
    } else {
      newVisible.add(credentialId);
    }
    setVisiblePasswords(newVisible);
  };

  const handleAddCredential = async () => {
    if (!credentialForm.client_id || !credentialForm.tool_name || !credentialForm.username || !credentialForm.password) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.from('client_credentials').insert({
        client_id: credentialForm.client_id,
        tool_name: credentialForm.tool_name,
        username: credentialForm.username,
        encrypted_password: encryptPassword(credentialForm.password),
        notes: credentialForm.notes,
        created_by: profile?.id,
      });

      if (error) throw error;

      showToast('Credential added successfully', 'success');
      setShowAddModal(false);
      setCredentialForm({
        client_id: '',
        tool_name: '',
        username: '',
        password: '',
        notes: '',
      });
      loadData();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCredential = async () => {
    if (!selectedCredential || !credentialForm.tool_name || !credentialForm.username) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      setSubmitting(true);

      const updateData: any = {
        tool_name: credentialForm.tool_name,
        username: credentialForm.username,
        notes: credentialForm.notes,
      };

      if (credentialForm.password) {
        updateData.encrypted_password = encryptPassword(credentialForm.password);
      }

      const { error } = await supabase
        .from('client_credentials')
        .update(updateData)
        .eq('id', selectedCredential.id);

      if (error) throw error;

      showToast('Credential updated successfully', 'success');
      setShowEditModal(false);
      setSelectedCredential(null);
      setCredentialForm({
        client_id: '',
        tool_name: '',
        username: '',
        password: '',
        notes: '',
      });
      loadData();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCredential = async () => {
    if (!selectedCredential) return;

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('client_credentials')
        .delete()
        .eq('id', selectedCredential.id);

      if (error) throw error;

      showToast('Credential deleted successfully', 'success');
      setShowDeleteDialog(false);
      setSelectedCredential(null);
      loadData();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (credential: Credential) => {
    setSelectedCredential(credential);
    setCredentialForm({
      client_id: credential.client_id,
      tool_name: credential.tool_name,
      username: credential.username,
      password: '',
      notes: credential.notes,
    });
    setShowEditModal(true);
  };

  const groupedCredentials: ClientGroup[] = credentials.reduce((groups: ClientGroup[], credential) => {
    const clientId = credential.client_id;
    const clientName = credential.clients?.name || 'Unknown Client';

    const existingGroup = groups.find((g) => g.clientId === clientId);
    if (existingGroup) {
      existingGroup.credentials.push(credential);
    } else {
      groups.push({
        clientId,
        clientName,
        credentials: [credential],
      });
    }
    return groups;
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-36" />
          </div>
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Client Credentials</h1>
          <p className="text-sm text-muted-foreground">Securely manage client access credentials</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={loadData}
            data-testid="button-refresh-credentials"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          {canEdit && (
            <Button
              onClick={() => setShowAddModal(true)}
              data-testid="button-add-credential"
            >
              <Plus className="h-4 w-4" />
              Add Credential
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground text-sm mb-1">Security Notice</p>
              <p className="text-sm text-muted-foreground">
                You can only view credentials for clients you are assigned to. Access is automatically
                granted based on your client assignments and revoked when you are removed from a project.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {groupedCredentials.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Key className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No credentials found</h3>
            <p className="text-muted-foreground mb-6">
              {canEdit
                ? 'Get started by adding your first client credential.'
                : 'No credentials available for your assigned clients.'}
            </p>
            {canEdit && (
              <Button
                onClick={() => setShowAddModal(true)}
                data-testid="button-add-first-credential"
              >
                <Plus className="h-5 w-5" />
                Add First Credential
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedCredentials.map((group) => (
            <Card key={group.clientId} data-testid={`card-client-group-${group.clientId}`}>
              <CardHeader className="bg-muted/50 border-b border-border pb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="p-2 bg-muted rounded-md">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg" data-testid={`text-client-name-${group.clientId}`}>{group.clientName}</CardTitle>
                    <p className="text-sm text-muted-foreground">{group.credentials.length} credential(s)</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {group.credentials.map((credential) => {
                    const isPasswordVisible = visiblePasswords.has(credential.id);
                    const decryptedPassword = decryptPassword(credential.encrypted_password);

                    return (
                      <div key={credential.id} className="p-6" data-testid={`card-credential-${credential.id}`}>
                        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted rounded-md">
                              <Key className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground text-lg" data-testid={`text-tool-name-${credential.id}`}>
                                {credential.tool_name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Added {new Date(credential.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {canEdit && (
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditModal(credential)}
                                data-testid={`button-edit-credential-${credential.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedCredential(credential);
                                  setShowDeleteDialog(true);
                                }}
                                data-testid={`button-delete-credential-${credential.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                              Username
                            </Label>
                            <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-md">
                              <span className="font-mono text-sm text-foreground select-none" data-testid={`text-username-${credential.id}`}>
                                {credential.username}
                              </span>
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                              Password
                            </Label>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-muted rounded-md">
                                <Lock className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono text-sm text-foreground select-none flex-1" data-testid={`text-password-${credential.id}`}>
                                  {isPasswordVisible ? decryptedPassword : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => togglePasswordVisibility(credential.id)}
                                data-testid={`button-toggle-password-${credential.id}`}
                              >
                                {isPasswordVisible ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>

                          {credential.notes && (
                            <div>
                              <Label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
                                Notes
                              </Label>
                              <div className="px-4 py-2 bg-muted rounded-md border border-border">
                                <p className="text-sm text-foreground" data-testid={`text-notes-${credential.id}`}>{credential.notes}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAddModal} onOpenChange={(open) => {
        if (!open) {
          setShowAddModal(false);
          setCredentialForm({ client_id: '', tool_name: '', username: '', password: '', notes: '' });
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Client Credential</DialogTitle>
            <DialogDescription>Add a new credential for a client tool or service.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client <span className="text-destructive">*</span></Label>
              <Select
                value={credentialForm.client_id}
                onValueChange={(value) => setCredentialForm({ ...credentialForm, client_id: value })}
              >
                <SelectTrigger data-testid="select-client-add">
                  <SelectValue placeholder="Select client..." />
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
              <Label>Tool/Service Name <span className="text-destructive">*</span></Label>
              <Input
                value={credentialForm.tool_name}
                onChange={(e) => setCredentialForm({ ...credentialForm, tool_name: e.target.value })}
                placeholder="e.g., Google Analytics, Facebook Ads"
                data-testid="input-tool-name-add"
              />
            </div>

            <div className="space-y-2">
              <Label>Username <span className="text-destructive">*</span></Label>
              <Input
                value={credentialForm.username}
                onChange={(e) => setCredentialForm({ ...credentialForm, username: e.target.value })}
                placeholder="Enter username or email"
                data-testid="input-username-add"
              />
            </div>

            <div className="space-y-2">
              <Label>Password <span className="text-destructive">*</span></Label>
              <Input
                type="password"
                value={credentialForm.password}
                onChange={(e) => setCredentialForm({ ...credentialForm, password: e.target.value })}
                placeholder="Enter password"
                data-testid="input-password-add"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={credentialForm.notes}
                onChange={(e) => setCredentialForm({ ...credentialForm, notes: e.target.value })}
                rows={3}
                placeholder="Additional notes or instructions"
                data-testid="textarea-notes-add"
              />
            </div>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    This credential will be automatically accessible to all team members assigned to this client.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setCredentialForm({ client_id: '', tool_name: '', username: '', password: '', notes: '' });
              }}
              data-testid="button-cancel-add"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCredential}
              disabled={submitting}
              data-testid="button-submit-add"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Credential
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={(open) => {
        if (!open) {
          setShowEditModal(false);
          setSelectedCredential(null);
          setCredentialForm({ client_id: '', tool_name: '', username: '', password: '', notes: '' });
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Credential</DialogTitle>
            <DialogDescription>Update the credential details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tool/Service Name <span className="text-destructive">*</span></Label>
              <Input
                value={credentialForm.tool_name}
                onChange={(e) => setCredentialForm({ ...credentialForm, tool_name: e.target.value })}
                data-testid="input-tool-name-edit"
              />
            </div>

            <div className="space-y-2">
              <Label>Username <span className="text-destructive">*</span></Label>
              <Input
                value={credentialForm.username}
                onChange={(e) => setCredentialForm({ ...credentialForm, username: e.target.value })}
                data-testid="input-username-edit"
              />
            </div>

            <div className="space-y-2">
              <Label>New Password (leave blank to keep current)</Label>
              <Input
                type="password"
                value={credentialForm.password}
                onChange={(e) => setCredentialForm({ ...credentialForm, password: e.target.value })}
                placeholder="Enter new password"
                data-testid="input-password-edit"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={credentialForm.notes}
                onChange={(e) => setCredentialForm({ ...credentialForm, notes: e.target.value })}
                rows={3}
                data-testid="textarea-notes-edit"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                setSelectedCredential(null);
                setCredentialForm({ client_id: '', tool_name: '', username: '', password: '', notes: '' });
              }}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCredential}
              disabled={submitting}
              data-testid="button-submit-edit"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Update Credential
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={(open) => {
        if (!open) {
          setShowDeleteDialog(false);
          setSelectedCredential(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Credential</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the credential for &quot;{selectedCredential?.tool_name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setSelectedCredential(null);
              }}
              disabled={submitting}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCredential}
              disabled={submitting}
              data-testid="button-confirm-delete"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
