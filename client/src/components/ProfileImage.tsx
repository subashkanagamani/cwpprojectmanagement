import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2 } from 'lucide-react';
import { useUpload } from '@/hooks/use-upload';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

interface ProfileImageProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  colorClass?: string;
  editable?: boolean;
  onImageUploaded?: (objectPath: string) => void;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-[10px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
};

export function ProfileImage({
  src,
  name,
  size = 'md',
  className = '',
  colorClass = 'bg-primary/10 text-primary',
  editable = false,
  onImageUploaded,
}: ProfileImageProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile } = useUpload({
    onSuccess: (response) => {
      onImageUploaded?.(response.objectPath);
      setUploading(false);
    },
    onError: () => {
      setUploading(false);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;

    setUploading(true);
    await uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`relative group inline-block ${className}`}>
      <Avatar className={`${sizeClass} ${editable ? 'cursor-pointer' : ''}`} onClick={() => editable && fileInputRef.current?.click()}>
        {src && <AvatarImage src={src} alt={name} className="object-cover" />}
        <AvatarFallback className={`${colorClass} font-semibold`}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : getInitials(name)}
        </AvatarFallback>
      </Avatar>
      {editable && !uploading && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <Camera className="h-4 w-4 text-white" />
        </button>
      )}
      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      )}
    </div>
  );
}

export function ClientLogo({
  src,
  name,
  size = 'md',
  className = '',
  editable = false,
  onImageUploaded,
}: ProfileImageProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile } = useUpload({
    onSuccess: (response) => {
      onImageUploaded?.(response.objectPath);
      setUploading(false);
    },
    onError: () => {
      setUploading(false);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    setUploading(true);
    await uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`relative group inline-block ${className}`}>
      <div
        className={`${sizeClass} rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold shrink-0 overflow-hidden ${editable ? 'cursor-pointer' : ''}`}
        onClick={() => editable && fileInputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin text-white" />
        ) : src ? (
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          getInitials(name).charAt(0)
        )}
      </div>
      {editable && !uploading && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <Camera className="h-4 w-4 text-white" />
        </button>
      )}
      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      )}
    </div>
  );
}
