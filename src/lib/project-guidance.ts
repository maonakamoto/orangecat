/**
 * Project Field Guidance Content
 *
 * LEGACY COMPATIBILITY LAYER
 *
 * This file re-exports from the consolidated entity-guidance system.
 * New code should import directly from '@/lib/entity-guidance'.
 *
 * Created: 2025-11-24
 * Last Modified: 2025-12-16
 * Last Modified Summary: Converted to re-export layer for backward compatibility
 */

// Re-export the canonical guidance content
export {
  projectGuidanceContent,
  projectDefaultGuidance,
  type ProjectFieldType,
} from '@/lib/entity-guidance/project-guidance';

// Legacy type aliases for backward compatibility
// New code should use GuidanceContent and DefaultGuidance from '@/components/create/types'
export interface FieldGuidanceContent {
  icon: React.ReactNode;
  title: string;
  description: string;
  tips: string[];
  examples?: string[];
}

export interface DefaultContent {
  title: string;
  description: string;
  features: Array<{
    icon: React.ReactNode;
    text: string;
  }>;
  hint?: string;
}
