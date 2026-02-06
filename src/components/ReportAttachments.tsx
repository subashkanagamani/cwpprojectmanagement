import { useState, useEffect } from 'react';
import { Paperclip, Upload, X, Download, File, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

interface Attachment {
  id: string;
  report_id: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  uploaded_by: string;
  created_at: string;
  profile?: {
    full_name: string;
  };
}

interface ReportAttachmentsProps {
  reportId: string;
  canUpload?: boolean;
  canDelete?: boolean;
}

export function ReportAttachments({ reportId, canUpload = true, canDelete = false }: ReportAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadAttachments();
  }, [reportId]);

  async function loadAttachments() {
    try {
      const { data, error } = await supabase
        .from('report_attachments')
        .select(`
          *,
          profile:profiles!uploaded_by(full_name)
        `)
        .eq('report_id', reportId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      showToast('File size must be less than 10MB', 'error');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${reportId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('report-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('report-attachments')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('report_attachments')
        .insert([{
          report_id: reportId,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user?.id
        }]);

      if (dbError) {
        await supabase.storage
          .from('report-attachments')
          .remove([fileName]);
        throw dbError;
      }

      showToast('File uploaded successfully', 'success');
      loadAttachments();
      event.target.value = '';
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(attachment: Attachment) {
    if (!confirm('Are you sure you want to delete this attachment?')) return;

    try {
      const fileName = attachment.file_url.split('/').slice(-2).join('/');

      const { error: dbError } = await supabase
        .from('report_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;

      await supabase.storage
        .from('report-attachments')
        .remove([fileName]);

      showToast('Attachment deleted successfully', 'success');
      loadAttachments();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  function formatFileSize(bytes?: number): string {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function getFileIcon(fileType?: string) {
    if (!fileType) return <File className="w-5 h-5 text-gray-400" />;

    if (fileType.startsWith('image/')) {
      return <File className="w-5 h-5 text-blue-500" />;
    } else if (fileType.includes('pdf')) {
      return <File className="w-5 h-5 text-red-500" />;
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return <File className="w-5 h-5 text-blue-600" />;
    } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return <File className="w-5 h-5 text-green-600" />;
    }
    return <File className="w-5 h-5 text-gray-400" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Attachments</h3>
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
            {attachments.length}
          </span>
        </div>
        {canUpload && (
          <label
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
              uploading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Upload File'}
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
            />
          </label>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Supported file types:</p>
          <p>PDF, Word documents, Excel spreadsheets, images (PNG, JPG, GIF)</p>
          <p className="mt-1">Maximum file size: 10MB</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading attachments...</p>
        </div>
      ) : attachments.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <Paperclip className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No attachments yet</p>
          {canUpload && (
            <p className="text-gray-400 text-sm mt-1">Upload files to attach them to this report</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getFileIcon(attachment.file_type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.file_name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span>{formatFileSize(attachment.file_size)}</span>
                    <span>•</span>
                    <span>Uploaded by {attachment.profile?.full_name || 'Unknown'}</span>
                    <span>•</span>
                    <span>{new Date(attachment.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <a
                  href={attachment.file_url}
                  download={attachment.file_name}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  aria-label="Download file"
                >
                  <Download className="w-4 h-4 text-gray-600" />
                </a>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(attachment)}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    aria-label="Delete attachment"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
