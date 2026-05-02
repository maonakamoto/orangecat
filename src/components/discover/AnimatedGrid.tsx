'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export type ViewMode = 'grid' | 'list';

export function AnimatedGrid<T extends { id: string }>({
  items,
  viewMode,
  renderItem,
}: {
  items: T[];
  viewMode: ViewMode;
  renderItem: (item: T) => ReactNode;
}) {
  return (
    <div
      className={`grid gap-6 ${
        viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
      }`}
    >
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.05 }}
        >
          {renderItem(item)}
        </motion.div>
      ))}
    </div>
  );
}
