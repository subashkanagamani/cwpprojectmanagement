import { ReactNode } from 'react';

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
  minWidth?: string;
}

export function ResponsiveTable({ children, className = '', minWidth = '800px' }: ResponsiveTableProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <div style={{ minWidth }} className="w-full">
          {children}
        </div>
      </div>

      <div className="lg:hidden px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
        Scroll horizontally to view more columns
      </div>
    </div>
  );
}

interface ResponsiveCardListProps<T> {
  data: T[];
  renderCard: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  emptyMessage?: string;
  className?: string;
}

export function ResponsiveCardList<T>({
  data,
  renderCard,
  keyExtractor,
  emptyMessage = 'No data available',
  className = ''
}: ResponsiveCardListProps<T>) {
  if (data.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center ${className}`}>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {data.map((item, index) => (
        <div
          key={keyExtractor(item, index)}
          className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          {renderCard(item, index)}
        </div>
      ))}
    </div>
  );
}

interface TouchFriendlyButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
}

export function TouchFriendlyButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  ariaLabel
}: TouchFriendlyButtonProps) {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200'
  };

  const sizes = {
    sm: 'min-h-[36px] min-w-[36px] px-3 py-1.5 text-sm',
    md: 'min-h-[44px] min-w-[44px] px-4 py-2 text-base',
    lg: 'min-h-[48px] min-w-[48px] px-6 py-3 text-lg'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        rounded-lg font-medium
        transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        touch-manipulation
        ${className}
      `}
    >
      {children}
    </button>
  );
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function MobileMenu({ isOpen, onClose, children }: MobileMenuProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`
          fixed top-0 right-0 bottom-0 w-80 bg-white z-50
          transform transition-transform duration-300 ease-in-out
          lg:hidden
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </>
  );
}
