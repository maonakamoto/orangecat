'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, ArrowRight } from 'lucide-react';
import { ROUTES } from '@/config/routes';

interface DiscoverHeroProps {
  totalProjects: number;
  totalProfiles: number;
  totalFinancial?: number;
}

export default function DiscoverHero({
  totalProjects,
  totalProfiles,
  totalFinancial = 0,
}: DiscoverHeroProps) {
  return (
    <motion.div
      className="relative overflow-hidden bg-gradient-to-br from-bitcoinOrange/5 via-tiffany-50/80 to-orange-50/60 dark:from-muted/50 dark:via-muted/30 dark:to-muted/20 border-b border-gray-100/50 dark:border-border"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.h1
            className="text-fluid-3xl font-extrabold tracking-tight text-gray-900 dark:text-foreground mb-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <span className="block">Discover Opportunities</span>
            <span className="block bg-gradient-to-r from-tiffany-600 via-bitcoinOrange to-orange-500 bg-clip-text text-transparent">
              Fund, Invest & Connect
            </span>
          </motion.h1>

          <motion.p
            className="mt-4 max-w-2xl mx-auto text-fluid-lg text-gray-600 dark:text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            Projects, causes, products, services, loans, investments, events, and more — from
            creators and communities around the world.
          </motion.p>

          {/* Stats - Compact */}
          <motion.div
            className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
          >
            <Link
              href={`${ROUTES.DISCOVER}?type=projects`}
              className="bg-white/80 dark:bg-card/80 backdrop-blur-md rounded-xl p-4 border border-white/80 dark:border-border shadow-card hover:shadow-md hover:border-orange-200 transition-all duration-200 block"
            >
              <div className="text-fluid-xl font-bold text-gray-900 dark:text-foreground">
                {totalProjects}
              </div>
              <div className="text-sm text-gray-600 dark:text-muted-foreground mt-1">
                Active Projects
              </div>
            </Link>
            <Link
              href={`${ROUTES.DISCOVER}?type=profiles`}
              className="bg-white/80 dark:bg-card/80 backdrop-blur-md rounded-xl p-4 border border-white/80 dark:border-border shadow-card hover:shadow-md hover:border-tiffany-200 transition-all duration-200 block"
            >
              <div className="text-fluid-xl font-bold text-tiffany-600">{totalProfiles}</div>
              <div className="text-sm text-gray-600 dark:text-muted-foreground mt-1">People</div>
            </Link>
            <div className="bg-white/80 dark:bg-card/80 backdrop-blur-md rounded-xl p-4 border border-white/80 dark:border-border shadow-card">
              <div className="text-fluid-xl font-bold text-bitcoinOrange">{totalFinancial}</div>
              <div className="text-sm text-gray-600 dark:text-muted-foreground mt-1">Finance</div>
            </div>
          </motion.div>

          {/* Creator CTA */}
          <motion.div
            className="mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1 }}
          >
            <Link
              href={ROUTES.AUTH}
              className="inline-flex items-center gap-2 px-6 py-3 bg-tiffany-600 hover:bg-tiffany-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              Start Creating
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
