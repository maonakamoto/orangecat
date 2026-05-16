'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Check, X, ArrowRight, Plus } from 'lucide-react';
import {
  PLATFORM_COMPARISON,
  PLATFORM_BENEFITS,
  TRUST_SIGNALS,
  SECTION_HEADERS,
  CTA_LABELS,
} from '@/config/landing-page';
import { cn } from '@/lib/utils';
import { GRADIENTS } from '@/config/gradients';
import { ROUTES } from '@/config/routes';

export default function TrustSection() {
  const { whyBitcoin } = SECTION_HEADERS;

  return (
    <section className="py-12 sm:py-16 lg:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-semibold text-gray-900 dark:text-foreground mb-3 sm:mb-4">
            {whyBitcoin.title}
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-muted-foreground max-w-3xl mx-auto">
            {whyBitcoin.subtitle}
          </p>
        </div>

        {/* Comparison Table - Desktop */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 sm:mb-20 hidden md:block"
        >
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-border">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-muted-foreground">
                      Feature
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600 dark:text-muted-foreground">
                      Traditional Platforms
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-tiffany-600 dark:text-primary bg-muted/50">
                      OrangeCat
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-border">
                  {PLATFORM_COMPARISON.map((row, index) => (
                    <motion.tr
                      key={row.feature}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className={row.highlight ? 'bg-green-50' : ''}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-foreground">
                        {row.feature}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <X className="w-4 h-4 text-red-500" />
                          <span className="text-sm text-gray-600 dark:text-muted-foreground">
                            {row.traditional}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center bg-muted/30">
                        <div className="flex items-center justify-center gap-2">
                          <Check className="w-4 h-4 text-green-600" />
                          <span
                            className={`text-sm font-semibold ${row.highlight ? 'text-green-700' : 'text-gray-900 dark:text-foreground'}`}
                          >
                            {row.orangecat}
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* Comparison Cards - Mobile */}
        <div className="mb-12 space-y-3 md:hidden">
          {PLATFORM_COMPARISON.map((row, index) => (
            <motion.div
              key={row.feature}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`bg-card rounded-lg shadow-sm border border-border p-4 ${row.highlight ? 'ring-2 ring-green-500 dark:ring-green-600' : ''}`}
            >
              <h4 className="text-sm font-semibold text-gray-900 dark:text-foreground mb-3">
                {row.feature}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <X className="w-3 h-3 text-red-500" />
                    <span className="text-xs font-medium text-muted-foreground">Traditional</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{row.traditional}</span>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Check className="w-3 h-3 text-green-600" />
                    <span className="text-xs font-medium text-tiffany-600 dark:text-primary">
                      OrangeCat
                    </span>
                  </div>
                  <span
                    className={`text-xs font-semibold ${row.highlight ? 'text-green-700' : 'text-gray-900 dark:text-foreground'}`}
                  >
                    {row.orangecat}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {PLATFORM_BENEFITS.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-muted mb-3 sm:mb-4">
                <benefit.icon className="w-6 h-6 sm:w-8 sm:h-8 text-tiffany-600 dark:text-primary" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-foreground mb-2">
                {benefit.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Trust Signals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-10 sm:mt-12 lg:mt-16 text-center"
        >
          <div className="inline-flex flex-wrap items-center justify-center gap-3 sm:gap-4 lg:gap-6 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 bg-muted rounded-xl">
            {TRUST_SIGNALS.map((signal, index) => (
              <div key={signal} className="flex items-center gap-1.5 sm:gap-2">
                {index > 0 && (
                  <div className="w-px h-3 sm:h-4 bg-gray-300 dark:bg-border hidden sm:block mr-3 sm:mr-4 lg:mr-6" />
                )}
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full" />
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-foreground">
                  {signal}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 sm:mt-16 lg:mt-20 text-center"
        >
          <p className="text-base sm:text-lg text-gray-600 dark:text-muted-foreground mb-6">
            Ready to make something? It&apos;s free, no gatekeepers.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              href={ROUTES.AUTH}
              className={cn(
                GRADIENTS.btnBitcoin,
                'inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold text-white rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200'
              )}
            >
              <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              {CTA_LABELS.startCreating}
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
            <Link
              href={ROUTES.DISCOVER}
              className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold text-foreground bg-card hover:bg-muted border border-border rounded-lg transition-all duration-200"
            >
              {CTA_LABELS.discoverAction}
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
