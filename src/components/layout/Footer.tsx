'use client';

import React from 'react';
import Link from 'next/link';
import { footerNavigation } from '@/config/navigation';
import { shouldShowFooter, ROUTES } from '@/config/routes';
import Logo from './Logo';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';

const footerLinkClass =
  'group flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1.5 rounded-md min-h-9';
const footerHeadingClass = 'text-xs font-medium text-muted-foreground uppercase tracking-normal';

const Footer = React.memo(function Footer() {
  const pathname = usePathname();
  const shouldRender = shouldShowFooter(pathname ?? '/');

  const scrollToTop = () => {
    if (typeof window !== 'undefined' && window.scrollTo) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Don't render footer on authenticated pages to avoid layout conflicts with sidebar
  if (!shouldRender) {
    return null;
  }

  return (
    <footer className="bg-background border-t border-border mt-auto relative">
      {/* Back to top button */}
      <button
        onClick={scrollToTop}
        className="absolute -top-5 right-4 sm:right-8 w-10 h-10 bg-card text-foreground rounded-md border border-border hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background flex items-center justify-center group z-10"
        aria-label="Back to top"
        type="button"
      >
        <ArrowUp className="w-4 h-4" />
      </button>

      <div className="max-w-7xl mx-auto py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Section */}
          <div className="sm:col-span-2 lg:col-span-1 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-4 mb-2">
                <Logo />
              </div>
              <p className="text-muted-foreground text-base leading-relaxed max-w-xs">
                Your AI economic agent — and the platform where it operates.
              </p>
            </div>

            {/* Social Links */}
            <div className="flex space-x-4">
              {footerNavigation.social.map(item => (
                <a
                  key={item.name}
                  href={item.href}
                  className="group w-9 h-9 bg-card border border-border rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Follow us on ${item.name}`}
                >
                  {item.icon && (
                    <item.icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                  )}
                </a>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-6">
            <h3 className={footerHeadingClass}>[ Navigation ]</h3>
            <ul className="space-y-3">
              {footerNavigation.product.map(item => (
                <li key={item.name}>
                  <Link href={item.href} className={footerLinkClass}>
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div className="space-y-6">
            <h3 className={footerHeadingClass}>[ Company ]</h3>
            <ul className="space-y-3">
              {footerNavigation.company.map(item => (
                <li key={item.name}>
                  {'external' in item && item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={footerLinkClass}
                    >
                      <span>{item.name}</span>
                    </a>
                  ) : (
                    <Link href={item.href} className={footerLinkClass}>
                      <span>{item.name}</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-6">
            <h3 className={footerHeadingClass}>[ Legal ]</h3>
            <ul className="space-y-3">
              {footerNavigation.legal.map(item => (
                <li key={item.name}>
                  <Link href={item.href} className={footerLinkClass}>
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter/CTA Section */}
          <div className="space-y-6 sm:col-span-2 lg:col-span-1">
            <h3 className={footerHeadingClass}>[ Stay Updated ]</h3>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Get the latest updates on economic freedom, Bitcoin, and building on OrangeCat.
              </p>
              <Link
                href={`${ROUTES.AUTH}?mode=register`}
                className="inline-flex items-center justify-center w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-background bg-foreground rounded-md hover:bg-muted-strong transition-colors min-h-10"
              >
                Get Started Today
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            <div className="text-sm text-muted-foreground text-center sm:text-left">
              <p>&copy; 2026 OrangeCat. All rights reserved.</p>
            </div>

            {/* Additional Links */}
            <div className="flex items-center space-x-6 text-sm">
              <Link
                href={ROUTES.DOCS}
                className="text-muted-foreground hover:text-foreground transition-colors hover:underline"
              >
                Documentation
              </Link>
              <a
                href="https://github.com/g-but/orangecat"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors hover:underline"
              >
                Source Code
              </a>
              <Link
                href={ROUTES.TECHNOLOGY}
                className="text-muted-foreground hover:text-foreground transition-colors hover:underline"
              >
                Technology
              </Link>
              <Link
                href={ROUTES.FAQ}
                className="text-muted-foreground hover:text-foreground transition-colors hover:underline"
              >
                FAQ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

export default Footer;
