import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Star, Trash2, X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface SavedFilter {
  id: string;
  user_id: string;
  name: string;
  page: string;
  filters: Record<string, any>;
  is_default: boolean;
  created_at: string;
}

interface SavedFiltersProps {
  page: string;
  currentFilters: Record<string, any>;
  onFilterApply: (filters: Record<string, any>) => void;
}

export function SavedFilters({ page, currentFilters, onFilterApply }: SavedFiltersProps) {
  const { showToast } = useToast();
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadSavedFilters();
  }, [page]);

  const loadSavedFilters = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('saved_filters')
        .select('*')
        .eq('user_id', user.id)
        .eq('page', page)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedFilters(data || []);

      const defaultFilter = data?.find(f => f.is_default);
      if (defaultFilter) {
        onFilterApply(defaultFilter.filters);
      }
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
  };

  const handleSaveFilter = async () => {
    if (!filterName.trim()) {
      showToast('Please enter a filter name', 'error');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (isDefault) {
        await supabase
          .from('saved_filters')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('page', page);
      }

      const { error } = await supabase
        .from('saved_filters')
        .insert({
          user_id: user.id,
          name: filterName,
          page,
          filters: currentFilters,
          is_default: isDefault,
        });

      if (error) throw error;

      showToast('Filter saved successfully', 'success');
      setShowSaveModal(false);
      setFilterName('');
      setIsDefault(false);
      loadSavedFilters();
    } catch (error) {
      console.error('Error saving filter:', error);
      showToast('Failed to save filter', 'error');
    }
  };

  const handleApplyFilter = (filter: SavedFilter) => {
    onFilterApply(filter.filters);
    setShowDropdown(false);
    showToast(`Applied filter: ${filter.name}`, 'success');
  };

  const handleSetDefault = async (filterId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase
        .from('saved_filters')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('page', page);

      const { error } = await supabase
        .from('saved_filters')
        .update({ is_default: true })
        .eq('id', filterId);

      if (error) throw error;

      showToast('Default filter updated', 'success');
      loadSavedFilters();
    } catch (error) {
      console.error('Error setting default filter:', error);
      showToast('Failed to set default filter', 'error');
    }
  };

  const handleDeleteFilter = async (filterId: string) => {
    if (!confirm('Are you sure you want to delete this saved filter?')) return;

    try {
      const { error } = await supabase
        .from('saved_filters')
        .delete()
        .eq('id', filterId);

      if (error) throw error;

      showToast('Filter deleted successfully', 'success');
      loadSavedFilters();
    } catch (error) {
      console.error('Error deleting filter:', error);
      showToast('Failed to delete filter', 'error');
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            <Star className="h-4 w-4" />
            Saved Filters
            {savedFilters.length > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {savedFilters.length}
              </span>
            )}
          </button>

          {showDropdown && savedFilters.length > 0 && (
            <div className="absolute top-full mt-2 left-0 w-80 bg-white rounded-lg shadow-xl border z-50 max-h-96 overflow-y-auto">
              {savedFilters.map((filter) => (
                <div
                  key={filter.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 border-b last:border-0"
                >
                  <button
                    onClick={() => handleApplyFilter(filter)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{filter.name}</span>
                      {filter.is_default && (
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {Object.keys(filter.filters).length} filters applied
                    </span>
                  </button>

                  <div className="flex gap-1">
                    {!filter.is_default && (
                      <button
                        onClick={() => handleSetDefault(filter.id)}
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Set as default"
                      >
                        <Star className="h-3 w-3 text-gray-400" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteFilter(filter.id)}
                      className="p-1 hover:bg-gray-200 rounded"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowSaveModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          <Save className="h-4 w-4" />
          Save Current Filters
        </button>
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Save Filter</h2>
              <button
                onClick={() => setShowSaveModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., Active High Priority Clients"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="is_default" className="text-sm text-gray-700">
                  Set as default filter for this page
                </label>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Current Filters:</p>
                <div className="text-xs text-gray-600 space-y-1">
                  {Object.entries(currentFilters).length === 0 ? (
                    <p>No filters applied</p>
                  ) : (
                    Object.entries(currentFilters).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="font-medium">{key}:</span>
                        <span>{JSON.stringify(value)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFilter}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  Save Filter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
