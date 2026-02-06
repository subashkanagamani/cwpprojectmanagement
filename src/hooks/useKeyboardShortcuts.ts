import { useEffect } from 'react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  callback: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      shortcuts.forEach(shortcut => {
        const ctrlMatch = shortcut.ctrl === undefined || shortcut.ctrl === (e.ctrlKey || e.metaKey);
        const altMatch = shortcut.alt === undefined || shortcut.alt === e.altKey;
        const shiftMatch = shortcut.shift === undefined || shortcut.shift === e.shiftKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && altMatch && shiftMatch && keyMatch) {
          e.preventDefault();
          shortcut.callback();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

export const commonShortcuts = {
  search: { key: 'k', ctrl: true, description: 'Open search' },
  newItem: { key: 'n', ctrl: true, description: 'Create new item' },
  save: { key: 's', ctrl: true, description: 'Save' },
  close: { key: 'Escape', description: 'Close modal' },
};
