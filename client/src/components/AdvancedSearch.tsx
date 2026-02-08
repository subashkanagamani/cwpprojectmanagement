import { useState } from 'react';
import { Search, X, Filter, SlidersHorizontal } from 'lucide-react';

interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'between';
  value: any;
}

interface AdvancedSearchProps {
  onSearch: (query: string, filters: SearchFilter[]) => void;
  fields: Array<{ name: string; label: string; type: 'text' | 'number' | 'date' | 'select'; options?: string[] }>;
  placeholder?: string;
}

export function AdvancedSearch({ onSearch, fields, placeholder = 'Search...' }: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilter[]>([]);

  const handleSearch = () => {
    onSearch(query, filters);
  };

  const addFilter = () => {
    setFilters([...filters, { field: fields[0].name, operator: 'contains', value: '' }]);
  };

  const updateFilter = (index: number, updates: Partial<SearchFilter>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    setFilters(newFilters);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setQuery('');
    setFilters([]);
    onSearch('', []);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            showFilters ? 'bg-blue-50 border-blue-500 text-blue-700' : 'hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
        <button
          onClick={handleSearch}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Search
        </button>
        {(query || filters.length > 0) && (
          <button
            onClick={clearAll}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {showFilters && (
        <div className="space-y-3 pt-3 border-t">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-700 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Advanced Filters
            </h4>
            <button
              onClick={addFilter}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              + Add Filter
            </button>
          </div>

          {filters.map((filter, index) => (
            <div key={index} className="flex gap-2 items-start">
              <select
                value={filter.field}
                onChange={(e) => updateFilter(index, { field: e.target.value })}
                className="border rounded px-3 py-2"
              >
                {fields.map((field) => (
                  <option key={field.name} value={field.name}>
                    {field.label}
                  </option>
                ))}
              </select>

              <select
                value={filter.operator}
                onChange={(e) => updateFilter(index, { operator: e.target.value as any })}
                className="border rounded px-3 py-2"
              >
                <option value="equals">Equals</option>
                <option value="contains">Contains</option>
                <option value="startsWith">Starts with</option>
                <option value="endsWith">Ends with</option>
                <option value="gt">Greater than</option>
                <option value="lt">Less than</option>
              </select>

              <input
                type="text"
                value={filter.value}
                onChange={(e) => updateFilter(index, { value: e.target.value })}
                placeholder="Value..."
                className="flex-1 border rounded px-3 py-2"
              />

              <button
                onClick={() => removeFilter(index)}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}

          {filters.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No filters added. Click "Add Filter" to get started.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
