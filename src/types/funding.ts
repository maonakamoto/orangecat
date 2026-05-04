import { CategoryValue } from '@/config/categories';

export interface FundingPage {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  bitcoin_address?: string;
  lightning_address?: string;
  website_url?: string;
  goal_amount?: number;
  current_amount?: number;
  total_funding: number;
  contributor_count: number;
  is_active: boolean;
  is_public: boolean;
  is_featured?: boolean;
  slug?: string;
  category?: CategoryValue;
  tags?: string[];
  featured_image_url?: string;
  end_date?: string;
  currency?: 'BTC' | 'SATS' | 'CHF' | 'USD' | 'EUR';
  created_at: string;
  updated_at: string;
}
