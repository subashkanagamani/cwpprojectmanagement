import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

interface AutoSaveOptions {
  reportId?: string;
  data: any;
  enabled?: boolean;
  delay?: number;
  onSave?: () => void;
}

export function useAutoSave({
  reportId,
  data,
  enabled = true,
  delay = 30000,
  onSave
}: AutoSaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedDataRef = useRef<string>('');
  const { showToast } = useToast();

  const saveReport = useCallback(async () => {
    if (!enabled || !reportId) return;

    const currentDataString = JSON.stringify(data);

    if (currentDataString === lastSavedDataRef.current) {
      return;
    }

    try {
      const { error } = await supabase
        .from('weekly_reports')
        .update({
          ...data,
          is_draft: true,
          last_auto_saved: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      lastSavedDataRef.current = currentDataString;

      if (onSave) {
        onSave();
      }
    } catch (error: any) {
      console.error('Auto-save error:', error);
    }
  }, [reportId, data, enabled, onSave]);

  useEffect(() => {
    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveReport();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, saveReport]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { saveReport };
}
