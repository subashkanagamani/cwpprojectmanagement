import { useState, useEffect } from 'react';
import { Download, Eye, Trash2, Share2, File, Search, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  const [submitting, setSubmitting] = useState(false);
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
      setSubmitting(true);
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
    } finally {
      setSubmitting(false);
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
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-40" />
        </div>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Shared Documents</h1>
          <p className="text-sm text-muted-foreground">Manage documents shared with clients</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          data-testid="button-share-document"
        >
          <Share2 className="h-4 w-4" />
          Share Document
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-documents"
              />
            </div>
            <Select
              value={selectedClient || "all"}
              onValueChange={(value) => setSelectedClient(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-[200px]" data-testid="select-filter-client">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="p-4" data-testid={`card-document-${doc.id}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 flex-1">
                    <File className="h-8 w-8 text-muted-foreground mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground" data-testid={`text-doc-title-${doc.id}`}>{doc.title}</h3>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                        <span>Client: {doc.clients.name}</span>
                        <span>Uploaded by: {doc.profiles.full_name}</span>
                        <Badge variant="outline" className="no-default-active-elevate">
                          {doc.permissions === 'download' ? (
                            <Download className="h-3 w-3 mr-1" />
                          ) : (
                            <Eye className="h-3 w-3 mr-1" />
                          )}
                          {doc.permissions === 'download' ? 'Can Download' : 'View Only'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={doc.permissions}
                      onValueChange={(value) =>
                        handleUpdatePermissions(doc.id, value as 'view' | 'download')
                      }
                    >
                      <SelectTrigger className="w-[140px]" data-testid={`select-permissions-${doc.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">View Only</SelectItem>
                        <SelectItem value="download">Can Download</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                    >
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`link-view-doc-${doc.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(doc.id)}
                      data-testid={`button-delete-doc-${doc.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredDocuments.length === 0 && (
            <div className="text-center py-12">
              <File className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No documents found</h3>
              <p className="text-muted-foreground mb-4">Share documents with clients to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsModalOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
            <DialogDescription>Share a document with a client by providing the details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Document Title <span className="text-destructive">*</span></Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter document title"
                data-testid="input-doc-title"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Enter a description"
                data-testid="textarea-doc-description"
              />
            </div>

            <div className="space-y-2">
              <Label>File URL <span className="text-destructive">*</span></Label>
              <Input
                value={formData.file_url}
                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                placeholder="https://example.com/document.pdf"
                data-testid="input-doc-url"
              />
            </div>

            <div className="space-y-2">
              <Label>Client <span className="text-destructive">*</span></Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              >
                <SelectTrigger data-testid="select-doc-client">
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
              <Label>Permissions <span className="text-destructive">*</span></Label>
              <Select
                value={formData.permissions}
                onValueChange={(value) => setFormData({ ...formData, permissions: value as 'view' | 'download' })}
              >
                <SelectTrigger data-testid="select-doc-permissions">
                  <SelectValue placeholder="Select permissions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View Only</SelectItem>
                  <SelectItem value="download">Can Download</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                data-testid="button-cancel-share"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                data-testid="button-submit-share"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Share Document
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
