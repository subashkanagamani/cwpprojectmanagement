import React, { useState, useEffect } from 'react';
import { Upload, Download, Eye, Trash2, Share2, Lock, File, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../Modal';
import FormSelect from '../forms/FormSelect';
import FormInput from '../forms/FormInput';
import FormTextArea from '../forms/FormTextArea';

interface SharedDocument {
  id: string;
  title: string;
  file_path: string;
  file_url: string;
  file_type: string;
  file_size: number;
  permissions: 'view' | 'download';
  client_id: string;
  uploaded_by: string;
  description: string;
  created_at: string;
  clients: { name: string };
  profiles: { full_name: string };
}

interface Client {
  id: string;
  name: string;
}

export default function SharedDocumentsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client_id: '',
    permissions: 'view' as 'view' | 'download',
    file_url: '',
  });

  useEffect(() => {
    fetchDocuments();
    fetchClients();
  }, []);

  const fetchDocuments = async () => {
    try {
      let query = supabase
        .from('shared_documents')
        .select(`
          *,
          clients(name),
          profiles:uploaded_by(full_name)
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      showToast('Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.client_id || !formData.file_url) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        client_id: formData.client_id,
        file_url: formData.file_url,
        file_name: formData.title,
        file_path: formData.file_url,
        file_type: 'application/pdf',
        permissions: formData.permissions,
        uploaded_by: user?.id,
      };

      const { error } = await supabase
        .from('shared_documents')
        .insert(payload);

      if (error) throw error;

      showToast('Document shared successfully', 'success');
      setIsModalOpen(false);
      resetForm();
      fetchDocuments();
    } catch (error) {
      showToast('Failed to share document', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const { error } = await supabase
        .from('shared_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Document deleted successfully', 'success');
      fetchDocuments();
    } catch (error) {
      showToast('Failed to delete document', 'error');
    }
  };

  const handleUpdatePermissions = async (id: string, newPermissions: 'view' | 'download') => {
    try {
      const { error } = await supabase
        .from('shared_documents')
        .update({ permissions: newPermissions })
        .eq('id', id);

      if (error) throw error;
      showToast('Permissions updated', 'success');
      fetchDocuments();
    } catch (error) {
      showToast('Failed to update permissions', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      client_id: '',
      permissions: 'view',
      file_url: '',
    });
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClient = !selectedClient || doc.client_id === selectedClient;
    return matchesSearch && matchesClient;
  });

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shared Documents</h1>
          <p className="text-gray-600">Manage documents shared with clients</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Share2 className="h-5 w-5" />
          Share Document
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="border rounded-lg px-4 py-2"
          >
            <option value="">All Clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="divide-y">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <File className="h-8 w-8 text-blue-600 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                    {doc.description && (
                      <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>Client: {doc.clients.name}</span>
                      <span>Uploaded by: {doc.profiles.full_name}</span>
                      <span className="flex items-center gap-1">
                        {doc.permissions === 'download' ? (
                          <Download className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        {doc.permissions === 'download' ? 'Can Download' : 'View Only'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={doc.permissions}
                    onChange={(e) =>
                      handleUpdatePermissions(doc.id, e.target.value as 'view' | 'download')
                    }
                    className="text-sm border rounded px-2 py-1"
                  >
                    <option value="view">View Only</option>
                    <option value="download">Can Download</option>
                  </select>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-gray-100 rounded"
                    title="View"
                  >
                    <Eye className="h-4 w-4 text-gray-600" />
                  </a>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredDocuments.length === 0 && (
          <div className="text-center py-12">
            <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
            <p className="text-gray-600 mb-4">Share documents with clients to get started</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title="Share Document"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Document Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <FormTextArea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
          />

          <FormInput
            label="File URL"
            value={formData.file_url}
            onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
            placeholder="https://example.com/document.pdf"
            required
          />

          <FormSelect
            label="Client"
            value={formData.client_id}
            onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
            required
          >
            <option value="">Select a client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </FormSelect>

          <FormSelect
            label="Permissions"
            value={formData.permissions}
            onChange={(e) =>
              setFormData({ ...formData, permissions: e.target.value as 'view' | 'download' })
            }
            required
          >
            <option value="view">View Only</option>
            <option value="download">Can Download</option>
          </FormSelect>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Share Document
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
