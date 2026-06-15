'use client';

import React from 'react';
import Link from 'next/link';
import { footerNavigation } from '@/config/navigation';
import { shouldShowFooter, ROUTES } from '@/config/routes';
import Logo from './Logo';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';
import { APP_NAME } from '@/config/brand';

const footerLinkClass =
  'group flex items-center text-sm text-fg-secondary hover:text-fg-primary transition-colors py-1.5 rounded-md min-h-9';
const footerHeadingClass = 'text-xs font-medium text-fg-secondary uppercase tracking-normal';

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
    <footer className="bg-surface-page border-t border-default mt-auto relative">
      {/* Back to top button */}
      <button
        onClick={scrollToTop}
        className="absolute -top-5 right-4 sm:right-8 w-10 h-10 bg-surface-base text-fg-primary rounded-md border border-default hover:bg-surface-raised transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background flex items-center justify-center group z-10"
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
              <p className="text-fg-secondary text-base leading-relaxed max-w-xs">
                Your AI economic agent — and the platform where it operates.
              </p>
            </div>

            {/* Social Links */}
            <div className="flex space-x-4">
              {footerNavigation.social.map(item => (
                <a
                  key={item.name}
                  href={item.href}
                  className="group w-9 h-9 bg-surface-base border border-default rounded-md flex items-center justify-center text-fg-secondary hover:text-fg-primary hover:bg-surface-raised transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
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
              <p className="text-sm text-fg-secondary leading-relaxed">
                Get the latest updates on economic freedom, Bitcoin, and building on {APP_NAME}.
              </p>
              <Link
                href={`${ROUTES.AUTH}?mode=register`}
                className="inline-flex items-center justify-center w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-fg-inverted bg-fg-primary rounded-md hover:bg-muted-strong transition-colors min-h-10"
              >
                Get Started Today
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-default">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            <div className="text-sm text-fg-secondary text-center sm:text-left">
              <p>&copy; 2026 {APP_NAME}. All rights reserved.</p>
            </div>

            {/* Additional Links — sourced from config.footerNavigation.bottomBar
                so adding/removing a link is a config-only change. */}
            <div className="flex items-center space-x-6 text-sm">
              {footerNavigation.bottomBar.map(link =>
                link.external ? (
                  <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={footerLinkClass}
                  >
                    {link.name}
                  </a>
                ) : (
                  <Link key={link.name} href={link.href} className={footerLinkClass}>
                    {link.name}
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

export default Footer;
