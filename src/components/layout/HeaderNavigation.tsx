/**
 * Header Navigation Component
 *
 * Reusable navigation component for headers with dropdown support
 * Eliminates code duplication between UnifiedHeader and AuthenticatedHeader
 *
 * Created: 2025-01-27
 * Last Modified: 2025-01-12
 * Last Modified Summary: Added dropdown menu support
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavigationItem {
  name: string;
  href?: string;
  children?: NavigationItem[];
  description?: string;
}

// Variant A: Horizontal header links
interface HeaderNavBarProps {
  items: NavigationItem[];
  isActive: (href: string) => boolean;
  className?: string;
}

// Variant B: Mobile drawer navigation used by Header.tsx
interface MobileDrawerProps {
  navigation: NavigationItem[];
  footer: {
    product?: Array<{ name: string; href: string }>;
    company?: Array<{ name: string; href: string }>;
    legal?: Array<{ name: string; href: string }>;
    social?: Array<{ name: string; href: string; icon?: LucideIcon }>;
  };
  onClose: () => void;
}

type HeaderNavigationProps = HeaderNavBarProps | MobileDrawerProps;

/**
 * Header Navigation Component
 *
 * Renders navigation links with consistent styling and active state indicators
 * Supports dropdown menus for items with children
 */
export function HeaderNavigation(props: HeaderNavigationProps) {
  // Variant B: Mobile drawer (navigation + footer + onClose)
  if ('navigation' in props) {
    const { navigation, footer, onClose } = props;
    const navItems = Array.isArray(navigation) ? navigation : [];
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 space-y-1">
          {navItems.map(item =>
            item.href ? (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2 min-h-11 rounded-md text-base text-foreground hover:bg-muted"
                onClick={onClose}
              >
                {item.name}
              </Link>
            ) : null
          )}
        </div>

        {/* Footer sections */}
        <div className="mt-auto border-t border-border-subtle">
          {(['product', 'company', 'legal'] as const).map(sectionKey => {
            const section = footer?.[sectionKey] || [];
            if (!section || section.length === 0) {
              return null;
            }
            return (
              <div key={sectionKey} className="p-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  {sectionKey}
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {section.map(link => (
                    <Link
                      key={`${sectionKey}-${link.href}`}
                      href={link.href}
                      className="px-3 py-2 min-h-11 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                      onClick={onClose}
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Variant A: Horizontal header links (default)
  const { items = [], isActive, className } = props as HeaderNavBarProps;
  const safeItems = Array.isArray(items) ? items : [];
  const activeFn = typeof isActive === 'function' ? isActive : () => false;
  return (
    <nav className={cn('flex items-center space-x-1', className)}>
      {safeItems.map(item => {
        if (item.children && item.children.length > 0) {
          return <HeaderNavDropdown key={item.name} item={item} isActive={activeFn} />;
        }

        if (!item.href) {
          return null;
        }
        return (
          <HeaderNavLink
            key={item.href}
            href={item.href}
            label={item.name}
            isActive={activeFn(item.href)}
          />
        );
      })}
    </nav>
  );
}

interface HeaderNavLinkProps {
  href: string;
  label: string;
  isActive: boolean;
}

/**
 * Header Navigation Link Component
 *
 * Individual navigation link with active state styling
 */
function HeaderNavLink({ href, label, isActive }: HeaderNavLinkProps) {
  const linkClasses = cn(
    'px-4 py-2.5 text-sm font-medium rounded-md transition-colors duration-150 relative',
    isActive
      ? 'text-foreground bg-muted'
      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
  );

  return (
    <Link href={href} className={linkClasses}>
      {label}
      {isActive && <div className="absolute inset-x-3 bottom-0 h-px bg-foreground" />}
    </Link>
  );
}

interface HeaderNavDropdownProps {
  item: NavigationItem;
  isActive: (href: string) => boolean;
}

/**
 * Header Navigation Dropdown Component
 *
 * Dropdown menu for navigation items with children
 */
function HeaderNavDropdown({ item, isActive }: HeaderNavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Check if any child is active
  const hasActiveChild = item.children?.some(child => child.href && isActive(child.href)) || false;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'px-4 py-2.5 min-h-11 text-sm font-medium rounded-md transition-colors duration-150 relative flex items-center gap-1',
          hasActiveChild
            ? 'text-foreground bg-muted'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
      >
        {item.name}
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
        {hasActiveChild && <div className="absolute inset-x-3 bottom-0 h-px bg-foreground" />}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-card rounded-lg shadow-sm border border-border py-2 z-50">
          {item.children?.map((child, _index) => {
            // Skip children without href
            if (!child.href) {
              return null;
            }

            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  'block px-4 py-2.5 min-h-11 text-sm transition-colors',
                  isActive(child.href)
                    ? 'text-foreground bg-muted font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
                onClick={() => setIsOpen(false)}
              >
                <div className="font-medium">{child.name}</div>
                {child.description && (
                  <div className="text-xs text-muted-foreground mt-0.5">{child.description}</div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
