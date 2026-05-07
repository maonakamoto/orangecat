/**
 * Service Templates
 *
 * Template definitions for service creation.
 *
 * Created: 2025-01-30
 * Last Modified: 2026-05-07
 */

import React from 'react';
import { Briefcase, Palette, Camera, Sparkles, Globe2 } from 'lucide-react';
import type { EntityTemplate } from '../types';
import type { UserServiceFormData } from '@/lib/validation';

export const SERVICE_TEMPLATES: EntityTemplate<UserServiceFormData>[] = [
  {
    id: 'consult-hour',
    icon: React.createElement(Briefcase, { className: 'w-4 h-4' }),
    name: '1-hour Consultation',
    tagline: 'Advisory call with a fixed rate and clear scope.',
    defaults: {
      title: '1-hour Consultation',
      description: 'Video call to review your needs, answer questions, and propose next steps.',
      category: 'Consulting',
      hourly_rate: null,
      fixed_price: 150,
      currency: 'CHF',
      duration_minutes: 60,
      service_location_type: 'remote',
      service_area: '',
      status: 'draft',
    },
  },
  {
    id: 'custom-creation',
    icon: React.createElement(Palette, { className: 'w-4 h-4' }),
    name: 'Custom Creation',
    tagline: 'Bespoke artwork, design, or illustration made to order.',
    defaults: {
      title: 'Custom Creation',
      description:
        'A fully custom piece made to your brief — share references, discuss concept, receive the final work.',
      category: 'Art & Illustration',
      hourly_rate: null,
      fixed_price: 500,
      currency: 'CHF',
      duration_minutes: null,
      service_location_type: 'remote',
      service_area: '',
      status: 'draft',
    },
  },
  {
    id: 'photo-session',
    icon: React.createElement(Camera, { className: 'w-4 h-4' }),
    name: 'Photography Session',
    tagline: 'Portrait, product, or event shoot with edited deliverables.',
    defaults: {
      title: 'Photography Session (1 hour)',
      description:
        '1-hour shoot at an agreed location. Includes 20 edited high-resolution images delivered within 5 days.',
      category: 'Photography',
      hourly_rate: null,
      fixed_price: 300,
      currency: 'CHF',
      duration_minutes: 60,
      service_location_type: 'both',
      service_area: '',
      status: 'draft',
    },
  },
  {
    id: 'coaching-session',
    icon: React.createElement(Sparkles, { className: 'w-4 h-4' }),
    name: 'Coaching / Mentoring',
    tagline: 'Structured session to unlock progress on a goal.',
    defaults: {
      title: 'Coaching Session (1 hour)',
      description:
        'One-on-one session focused on a specific challenge. We set goals, work through blocks, and leave with a clear action plan.',
      category: 'Coaching & Mentoring',
      hourly_rate: 120,
      fixed_price: null,
      currency: 'CHF',
      duration_minutes: 60,
      service_location_type: 'remote',
      service_area: '',
      status: 'draft',
    },
  },
  {
    id: 'local-visit',
    icon: React.createElement(Globe2, { className: 'w-4 h-4' }),
    name: 'On-site Session',
    tagline: 'Local visit for hands-on help, training, or audits.',
    defaults: {
      title: 'On-site Session (2 hours)',
      description:
        'Hands-on help at your location: setup, training, or consultation. Travel within service area included.',
      category: 'Consulting',
      hourly_rate: 100,
      fixed_price: null,
      currency: 'CHF',
      duration_minutes: 120,
      service_location_type: 'onsite',
      service_area: '',
      status: 'draft',
    },
  },
];
