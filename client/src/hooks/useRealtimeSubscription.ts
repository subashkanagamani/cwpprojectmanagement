import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeSubscriptionOptions {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onChange?: (payload: any) => void;
}

export function useRealtimeSubscription({
  table,
  event = '*',
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
}: UseRealtimeSubscriptionOptions) {
  useEffect(() => {
    let channel: RealtimeChannel;

    const setupSubscription = () => {
      let subscription = supabase
        .channel(`${table}-changes`)
        .on(
          'postgres_changes',
          {
            event,
            schema: 'public',
            table,
            filter,
          } as any,
          (payload) => {
            if (onChange) {
              onChange(payload);
            }

            if (payload.eventType === 'INSERT' && onInsert) {
              onInsert(payload);
            } else if (payload.eventType === 'UPDATE' && onUpdate) {
              onUpdate(payload);
            } else if (payload.eventType === 'DELETE' && onDelete) {
              onDelete(payload);
            }
          }
        );

      channel = subscription.subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [table, event, filter, onInsert, onUpdate, onDelete, onChange]);
}

export function useRealtimeNotifications(userId: string, onNotification: (notification: any) => void) {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        } as any,
        (payload) => {
          onNotification(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onNotification]);
}
