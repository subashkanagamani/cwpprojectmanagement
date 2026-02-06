import { useState } from 'react';
import { Upload, X, File, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  maxSizeMB?: number;
  multiple?: boolean;
}

export function FileUpload({ onUpload, accept, maxSizeMB = 10, multiple = false }: FileUploadProps) {
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const validateFile = (file: File): boolean => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      showToast(`File size exceeds ${maxSizeMB}MB limit`, 'error');
      return false;
    }
    return true;
  };

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (validateFile(file)) {
          await onUpload(file);
        }
      }
      showToast('File(s) uploaded successfully', 'success');
    } catch (error) {
      console.error('Upload error:', error);
      showToast('Failed to upload file(s)', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
        dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      <input
        type="file"
        onChange={handleChange}
        accept={accept}
        multiple={multiple}
        className="hidden"
        id="file-upload"
        disabled={uploading}
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <Upload className={`h-12 w-12 mx-auto mb-4 ${dragActive ? 'text-blue-600' : 'text-gray-400'}`} />
        <p className="text-lg font-medium text-gray-900 mb-2">
          {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
        </p>
        <p className="text-sm text-gray-600">
          Max file size: {maxSizeMB}MB
        </p>
      </label>
    </div>
  );
}
