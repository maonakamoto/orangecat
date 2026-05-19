'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useDropdown } from '@/hooks/useDropdown';
import { cn } from '@/lib/utils';
import { CREATE_OPTIONS, shouldShowDivider } from './SmartCreateButton';

export function HeaderCreateButton() {
  const { isOpen, dropdownRef, buttonRef, toggle, close } = useDropdown({
    closeOnRouteChange: true,
    keyboardNavigation: true,
    itemCount: CREATE_OPTIONS.length,
  });

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={toggle}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-md bg-foreground text-background transition-colors duration-150 sm:h-9 sm:w-9',
          'hover:bg-muted-strong',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
          'touch-manipulation',
          isOpen && 'bg-muted-strong'
        )}
        aria-label="Create new"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Plus
          className={cn(
            'w-5 h-5 sm:w-5 sm:h-5 transition-transform duration-200',
            isOpen && 'rotate-45'
          )}
        />
      </button>

      {isOpen && (
        <div
          className="fixed z-50 overflow-hidden rounded-md border border-border-subtle bg-card shadow-none animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-200 origin-top-right"
          style={{
            top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + 12 : 'auto',
            right: buttonRef.current
              ? Math.max(16, window.innerWidth - buttonRef.current.getBoundingClientRect().right)
              : 'auto',
            width: Math.min(320, window.innerWidth - 32),
          }}
          role="menu"
          aria-orientation="vertical"
          aria-label="Create new"
        >
          <div className="p-2 max-h-[70vh] overflow-y-auto">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Create New
            </div>
            <div className="space-y-0.5">
              {CREATE_OPTIONS.map((option, index) => (
                <div key={option.name}>
                  <Link
                    href={option.href}
                    onClick={close}
                    className="group flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted"
                    role="menuitem"
                    tabIndex={isOpen ? 0 : -1}
                  >
                    <div className="oc-icon-tile h-9 w-9">
                      <option.icon className={cn('w-4 h-4', option.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground transition-colors group-hover:text-tiffany-600 dark:group-hover:text-tiffany-400">
                        {option.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {option.description}
                      </div>
                    </div>
                  </Link>
                  {shouldShowDivider(option, CREATE_OPTIONS[index + 1]) && (
                    <div className="my-1.5 mx-3 border-t border-border-subtle" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
