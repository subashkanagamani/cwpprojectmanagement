import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface MobileNavProps {
  navigation: Array<{ id: string; label: string; icon: any }>;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function MobileNav({ navigation, currentPage, onNavigate }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-64 bg-white shadow-xl z-40 lg:hidden overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Menu</h2>
              <nav className="space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </>
      )}
    </>
  );
}
