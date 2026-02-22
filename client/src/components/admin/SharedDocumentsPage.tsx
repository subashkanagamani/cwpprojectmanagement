import { useState, useEffect } from 'react';
import { Download, Trash2, Plus, Search, Loader2, Upload, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useUpload } from '../../hooks/use-upload';

interface SharedDocument {
  id: string;
  file_name: string;
  file_path: string;
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
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [formData, setFormData] = useState({
    description: '',
    client_id: '',
    permissions: 'view' as 'view' | 'download',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { uploadFile, isUploading: isUploadingFile, progress } = useUpload({
    onSuccess: (response) => {
      setUploadedObjectPath(response.objectPath);
    },
  });
  const [uploadedObjectPath, setUploadedObjectPath] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
    fetchClients();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('shared_documents')
        .select(`
          *,
          clients(name),
          profiles:uploaded_by(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
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
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !formData.client_id) {
      showToast('Please select a file and client', 'error');
      return;
    }

    setUploading(true);
    try {
      const uploadResult = await uploadFile(selectedFile);
      if (!uploadResult) {
        throw new Error('File upload failed');
      }

      const { error } = await (supabase.from('shared_documents') as any).insert({
        file_name: selectedFile.name,
        file_path: uploadResult.objectPath,
        file_type: selectedFile.type || 'application/octet-stream',
        file_size: selectedFile.size,
        permissions: formData.permissions,
        client_id: formData.client_id,
        uploaded_by: user?.id,
        description: formData.description,
      });

      if (error) throw error;

      showToast('Document uploaded successfully', 'success');
      setIsModalOpen(false);
      setSelectedFile(null);
      setUploadedObjectPath(null);
      setFormData({ description: '', client_id: '', permissions: 'view' });
      fetchDocuments();
    } catch (error: any) {
      showToast(error.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (doc: SharedDocument) => {
    window.open(doc.file_path, '_blank');
  };

  const handleDelete = async (doc: SharedDocument) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const { error: dbError } = await supabase
        .from('shared_documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      showToast('Document deleted successfully', 'success');
      fetchDocuments();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      client_id: '',
      permissions: 'view',
    });
    setSelectedFile(null);
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClient = !selectedClient || doc.client_id === selectedClient;
    return matchesSearch && matchesClient;
  });

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(2)} KB` : `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-8">
      <div className="animate-fade-up flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shared Documents</h1>
          <p className="text-muted-foreground mt-1">Manage client documents and files</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <div className="animate-fade-up grid grid-cols-1 md:grid-cols-3 gap-5" style={{ animationDelay: "100ms" }}>
        <Card className="stat-card-gradient blue">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-blue-50 dark:bg-blue-950/30">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold text-foreground">{documents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card-gradient green">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-green-50 dark:bg-green-950/30">
                <Download className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Downloadable</p>
                <p className="text-2xl font-bold text-foreground">{documents.filter(d => d.permissions === 'download').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card-gradient purple">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-purple-50 dark:bg-purple-950/30">
                <Upload className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">View Only</p>
                <p className="text-2xl font-bold text-foreground">{documents.filter(d => d.permissions === 'view').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 max-w-md"
                />
              </div>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="h-8 w-8 opacity-40 mb-3" />
                <p className="text-sm text-muted-foreground">No documents found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDocuments.map((doc, index) => (
                  <div
                    key={doc.id}
                    className="animate-fade-up flex items-center justify-between p-3.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg p-2 bg-blue-50 dark:bg-blue-950/30">
                          <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{doc.file_name}</span>
                        </div>
                        <Badge variant="outline">{doc.clients.name}</Badge>
                        <Badge variant={doc.permissions === 'download' ? 'default' : 'secondary'}>
                          {doc.permissions}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground ml-11">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>Uploaded by {doc.profiles.full_name}</span>
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                      {doc.description && (
                        <p className="mt-2 text-sm text-muted-foreground ml-11">{doc.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {doc.permissions === 'download' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(doc)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleUpload(); }} className="space-y-4">
            <div>
              <Label>Client</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
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
              <Label>File</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                    }
                  }}
                  className="flex-1"
                />
              </div>
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Document description..."
                rows={3}
              />
            </div>

            <div>
              <Label>Permissions</Label>
              <Select
                value={formData.permissions}
                onValueChange={(value: 'view' | 'download') =>
                  setFormData({ ...formData, permissions: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View Only</SelectItem>
                  <SelectItem value="download">View & Download</SelectItem>
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
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploading || !selectedFile}>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
