import { supabase } from './supabase';

export interface LogActivityParams {
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
}

export async function logActivity({
  action,
  entityType,
  entityId,
  details,
}: LogActivityParams): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn('Cannot log activity: no user found');
      return;
    }

    await (supabase.from('activity_logs') as any).insert({
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

export function logCreate(
  entityType: string,
  entityId: string,
  details?: Record<string, any>
): void {
  logActivity({
    action: 'create',
    entityType,
    entityId,
    details,
  });
}

export function logUpdate(
  entityType: string,
  entityId: string,
  details?: Record<string, any>
): void {
  logActivity({
    action: 'update',
    entityType,
    entityId,
    details,
  });
}

export function logDelete(
  entityType: string,
  entityId: string,
  details?: Record<string, any>
): void {
  logActivity({
    action: 'delete',
    entityType,
    entityId,
    details,
  });
}
