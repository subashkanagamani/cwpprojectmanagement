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
  RefreshCw
} from 'lucide-react';
import { Modal } from '../Modal';
import { LoadingButton } from '../LoadingButton';
import { ConfirmDialog } from '../ConfirmDialog';

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
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading credentials...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Credentials</h1>
          <p className="text-gray-600">Securely manage client access credentials</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          {canEdit && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              Add Credential
            </button>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded-r-lg">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-1">Security Notice</h3>
            <p className="text-sm text-yellow-800">
              You can only view credentials for clients you are assigned to. Access is automatically
              granted based on your client assignments and revoked when you are removed from a project.
            </p>
          </div>
        </div>
      </div>

      {groupedCredentials.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Key className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No credentials found</h3>
          <p className="text-gray-600 mb-6">
            {canEdit
              ? 'Get started by adding your first client credential.'
              : 'No credentials available for your assigned clients.'}
          </p>
          {canEdit && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="h-5 w-5" />
              Add First Credential
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedCredentials.map((group) => (
            <div key={group.clientId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-200 rounded-lg">
                    <Building2 className="h-5 w-5 text-blue-700" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-blue-900">{group.clientName}</h2>
                    <p className="text-sm text-blue-700">{group.credentials.length} credential(s)</p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {group.credentials.map((credential) => {
                  const isPasswordVisible = visiblePasswords.has(credential.id);
                  const decryptedPassword = decryptPassword(credential.encrypted_password);

                  return (
                    <div key={credential.id} className="p-6 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <Key className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">
                              {credential.tool_name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Added {new Date(credential.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {canEdit && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditModal(credential)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCredential(credential);
                                setShowDeleteDialog(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                            Username
                          </label>
                          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                            <span className="font-mono text-sm text-gray-900 select-none">
                              {credential.username}
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                            Password
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                              <Lock className="h-4 w-4 text-gray-400" />
                              <span className="font-mono text-sm text-gray-900 select-none flex-1">
                                {isPasswordVisible ? decryptedPassword : '••••••••••••'}
                              </span>
                            </div>
                            <button
                              onClick={() => togglePasswordVisibility(credential.id)}
                              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                              title={isPasswordVisible ? 'Hide password' : 'Show password'}
                            >
                              {isPasswordVisible ? (
                                <EyeOff className="h-4 w-4 text-gray-600" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-600" />
                              )}
                            </button>
                          </div>
                        </div>

                        {credential.notes && (
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                              Notes
                            </label>
                            <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-sm text-gray-700">{credential.notes}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setCredentialForm({
            client_id: '',
            tool_name: '',
            username: '',
            password: '',
            notes: '',
          });
        }}
        title="Add Client Credential"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client <span className="text-red-500">*</span>
            </label>
            <select
              value={credentialForm.client_id}
              onChange={(e) => setCredentialForm({ ...credentialForm, client_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select client...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tool/Service Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={credentialForm.tool_name}
              onChange={(e) => setCredentialForm({ ...credentialForm, tool_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Google Analytics, Facebook Ads"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={credentialForm.username}
              onChange={(e) => setCredentialForm({ ...credentialForm, username: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter username or email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={credentialForm.password}
              onChange={(e) => setCredentialForm({ ...credentialForm, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter password"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={credentialForm.notes}
              onChange={(e) => setCredentialForm({ ...credentialForm, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Additional notes or instructions"
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800">
              This credential will be automatically accessible to all team members assigned to this client.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <LoadingButton
              onClick={handleAddCredential}
              loading={submitting}
              className="flex-1 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Add Credential
            </LoadingButton>
            <button
              onClick={() => {
                setShowAddModal(false);
                setCredentialForm({
                  client_id: '',
                  tool_name: '',
                  username: '',
                  password: '',
                  notes: '',
                });
              }}
              className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedCredential(null);
          setCredentialForm({
            client_id: '',
            tool_name: '',
            username: '',
            password: '',
            notes: '',
          });
        }}
        title="Edit Credential"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tool/Service Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={credentialForm.tool_name}
              onChange={(e) => setCredentialForm({ ...credentialForm, tool_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={credentialForm.username}
              onChange={(e) => setCredentialForm({ ...credentialForm, username: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password (leave blank to keep current)
            </label>
            <input
              type="password"
              value={credentialForm.password}
              onChange={(e) => setCredentialForm({ ...credentialForm, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={credentialForm.notes}
              onChange={(e) => setCredentialForm({ ...credentialForm, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <LoadingButton
              onClick={handleUpdateCredential}
              loading={submitting}
              className="flex-1 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Update Credential
            </LoadingButton>
            <button
              onClick={() => {
                setShowEditModal(false);
                setSelectedCredential(null);
                setCredentialForm({
                  client_id: '',
                  tool_name: '',
                  username: '',
                  password: '',
                  notes: '',
                });
              }}
              className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedCredential(null);
        }}
        onConfirm={handleDeleteCredential}
        title="Delete Credential"
        message={`Are you sure you want to delete the credential for "${selectedCredential?.tool_name}"? This action cannot be undone.`}
        confirmText="Delete"
        loading={submitting}
      />
    </div>
  );
}
