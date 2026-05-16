'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useDropdown } from '@/hooks/useDropdown';
import { cn } from '@/lib/utils';
import { CREATE_OPTIONS, shouldShowDivider } from './SmartCreateButton';
import { GRADIENTS } from '@/config/gradients';

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
          'flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-xl transition-all duration-200',
          `${GRADIENTS.brandMixed} text-white`,
          'hover:from-orange-600 hover:to-tiffany-600 hover:shadow-md',
          'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2',
          'touch-manipulation',
          isOpen && 'shadow-md'
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
          className="fixed z-50 rounded-xl shadow-xl bg-card border border-border-subtle animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-200 origin-top-right overflow-hidden"
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
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group"
                    role="menuitem"
                    tabIndex={isOpen ? 0 : -1}
                  >
                    <div className={cn('p-2 rounded-lg', option.bgColor)}>
                      <option.icon className={cn('w-4 h-4', option.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground group-hover:text-orange-600 transition-colors">
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
