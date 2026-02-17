import { AlertCircle } from 'lucide-react';
import { isDemoMode } from '../lib/supabase';

export function DemoModeBanner() {
  if (!isDemoMode) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-sm flex items-center justify-center gap-2">
      <AlertCircle className="h-4 w-4" />
      <span>
        <strong>Demo Mode:</strong> This is a demonstration environment. Data is stored locally and will not persist.
      </span>
    </div>
  );
}
