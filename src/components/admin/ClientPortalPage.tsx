import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Client, ClientPortalUser } from '../../lib/database.types';
import { Plus, Edit2, Trash2, X, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

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
    return <div className="text-center py-12">Loading portal users...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Client Portal</h1>
          <p className="text-gray-600 mt-1">Manage client-side user access</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus className="h-5 w-5" />
          Add Portal User
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
        <h3 className="font-bold text-gray-900 mb-2">About Client Portal</h3>
        <p className="text-sm text-gray-700">
          Client portal users have read-only access to view their reports and performance data. They
          cannot edit anything or view other clients' information.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {portalUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.full_name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{user.client?.name}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleUserStatus(user)}
                    className="flex items-center gap-2"
                  >
                    {user.is_active ? (
                      <>
                        <Eye className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600 font-medium">Active</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500 font-medium">Inactive</span>
                      </>
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {portalUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No portal users yet. Add your first portal user to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Add Portal User</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                <select
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
