import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface UseSecureQueryOptions {
  table: string;
  select?: string;
  filters?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

interface UseSecureQueryResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => Promise<void>;
}

export function useSecureQuery<T = any>(options: UseSecureQueryOptions): UseSecureQueryResult<T> {
  const { profile, user } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const isAdmin = profile?.role === 'admin';
  const enabled = options.enabled !== false;

  const fetchData = useCallback(async () => {
    if (!user || !enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = (supabase.from(options.table) as any).select(options.select || '*', { count: 'exact' });

      // Apply role-based filtering for non-admin users
      if (!isAdmin && user) {
        // Tables that use employee_id
        const employeeIdTables = ['weekly_reports', 'client_assignments', 'tasks', 'time_entries', 'daily_tasks'];
        // Tables that use user_id  
        const userIdTables = ['notifications', 'dashboard_widgets', 'activity_logs'];
        
        if (employeeIdTables.includes(options.table)) {
          query = query.eq('employee_id', user.id);
        } else if (userIdTables.includes(options.table)) {
          query = query.eq('user_id', user.id);
        }
        // For tables like 'clients', 'services' - employees can see all (read-only)
      }

      // Apply custom filters
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '' && value !== '_all' && value !== 'all') {
            query = query.eq(key, value);
          }
        });
      }

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? false });
      }

      // Apply pagination
      if (options.page !== undefined && options.pageSize !== undefined) {
        const from = (options.page - 1) * options.pageSize;
        const to = from + options.pageSize - 1;
        query = query.range(from, to);
      } else if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data: result, error: queryError, count } = await query;

      if (queryError) throw queryError;
      setData(result || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      console.error(`Error fetching ${options.table}:`, err);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, options.table, options.select, JSON.stringify(options.filters), options.orderBy?.column, options.orderBy?.ascending, options.page, options.pageSize, options.limit, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, totalCount, refetch: fetchData };
}

export function getSecureFilter(profile: any, userId: string) {
  return {
    isAdmin: profile?.role === 'admin',
    userId,
    applyFilter: (query: any, table: string) => {
      if (profile?.role === 'admin') return query;
      
      const employeeIdTables = ['weekly_reports', 'client_assignments', 'tasks', 'time_entries', 'daily_tasks'];
      const userIdTables = ['notifications', 'dashboard_widgets', 'activity_logs'];
      
      if (employeeIdTables.includes(table)) {
        return query.eq('employee_id', userId);
      } else if (userIdTables.includes(table)) {
        return query.eq('user_id', userId);
      }
      return query;
    }
  };
}
