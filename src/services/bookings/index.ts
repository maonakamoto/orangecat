/**
 * Booking Service
 *
 * Handles booking operations for services and asset rentals.
 * Provides availability checking, booking creation, and status management.
 */

import type { AnySupabaseClient } from '@/lib/supabase/types';

import { DATABASE_TABLES } from '@/config/database-tables';
import { STATUS } from '@/config/database-constants';
import { logger } from '@/utils/logger';

// Types
type BookableType = 'service' | 'asset';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'no_show';

interface Booking {
  id: string;
  bookable_type: BookableType;
  bookable_id: string;
  provider_actor_id: string;
  customer_actor_id: string;
  customer_user_id: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  duration_minutes?: number;
  price_btc: number;
  currency: string;
  deposit_btc: number;
  deposit_paid: boolean;
  total_paid_btc: number;
  status: BookingStatus;
  customer_notes?: string;
  provider_notes?: string;
  cancellation_reason?: string;
  metadata?: Record<string, unknown>;
  confirmed_at?: string;
  cancelled_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

interface BookingResult {
  success: boolean;
  booking?: Booking;
  error?: string;
}

/**
 * Booking Service Class
 */
class BookingService {
  constructor(private supabase: AnySupabaseClient) {}

  private async updateBookingStatus(opts: {
    bookingId: string;
    updateData: Record<string, unknown>;
    actorField: string;
    actorId: string;
    allowedStatuses: string[];
    errorMessage: string;
  }): Promise<BookingResult> {
    let q = this.supabase
      .from(DATABASE_TABLES.BOOKINGS)
      .update(opts.updateData)
      .eq('id', opts.bookingId)
      .eq(opts.actorField, opts.actorId);
    q =
      opts.allowedStatuses.length === 1
        ? q.eq('status', opts.allowedStatuses[0])
        : q.in('status', opts.allowedStatuses);
    const { data: booking, error } = await q.select().single();
    return error || !booking
      ? { success: false, error: opts.errorMessage }
      : { success: true, booking };
  }

  async confirmBooking(bookingId: string, providerActorId: string): Promise<BookingResult> {
    return this.updateBookingStatus({
      bookingId,
      updateData: { status: STATUS.BOOKINGS.CONFIRMED, confirmed_at: new Date().toISOString() },
      actorField: 'provider_actor_id',
      actorId: providerActorId,
      allowedStatuses: [STATUS.BOOKINGS.PENDING],
      errorMessage: 'Failed to confirm booking',
    });
  }

  async rejectBooking(
    bookingId: string,
    providerActorId: string,
    reason?: string
  ): Promise<BookingResult> {
    return this.updateBookingStatus({
      bookingId,
      updateData: {
        status: STATUS.BOOKINGS.REJECTED,
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
      },
      actorField: 'provider_actor_id',
      actorId: providerActorId,
      allowedStatuses: [STATUS.BOOKINGS.PENDING],
      errorMessage: 'Failed to reject booking',
    });
  }

  async cancelBooking(
    bookingId: string,
    customerUserId: string,
    reason?: string
  ): Promise<BookingResult> {
    return this.updateBookingStatus({
      bookingId,
      updateData: {
        status: STATUS.BOOKINGS.CANCELLED,
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
      },
      actorField: 'customer_user_id',
      actorId: customerUserId,
      allowedStatuses: [STATUS.BOOKINGS.PENDING, STATUS.BOOKINGS.CONFIRMED],
      errorMessage: 'Failed to cancel booking',
    });
  }

  async completeBooking(bookingId: string, providerActorId: string): Promise<BookingResult> {
    return this.updateBookingStatus({
      bookingId,
      updateData: { status: STATUS.BOOKINGS.COMPLETED, completed_at: new Date().toISOString() },
      actorField: 'provider_actor_id',
      actorId: providerActorId,
      allowedStatuses: [STATUS.BOOKINGS.CONFIRMED, STATUS.BOOKINGS.IN_PROGRESS],
      errorMessage: 'Failed to complete booking',
    });
  }

  /**
   * Get bookings for a user (as customer or provider)
   */
  async getUserBookings(
    userId: string,
    options: {
      role?: 'customer' | 'provider' | 'both';
      status?: BookingStatus[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<
    (Booking & {
      customer?: { id: string; username: string; display_name?: string; avatar_url?: string };
    })[]
  > {
    const { role = 'both', status, limit = 20, offset = 0 } = options;

    // Get user's actor IDs
    const { data: actors } = await this.supabase
      .from(DATABASE_TABLES.ACTORS)
      .select('id')
      .eq('user_id', userId);

    const actorIds = actors?.map(a => a.id) || [];

    let query = this.supabase
      .from(DATABASE_TABLES.BOOKINGS)
      .select(
        `
        *,
        customer:customer_actor_id(
          id,
          username,
          display_name,
          avatar_url
        )
      `
      )
      .order('starts_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (role === 'customer') {
      query = query.eq('customer_user_id', userId);
    } else if (role === 'provider') {
      query = query.in('provider_actor_id', actorIds);
    } else {
      query = query.or(
        `customer_user_id.eq.${userId},provider_actor_id.in.(${actorIds.join(',')})`
      );
    }

    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching bookings', { error }, 'BookingService');
      return [];
    }

    return data || [];
  }

  /**
   * Get booking by ID
   */
  async getBooking(bookingId: string): Promise<Booking | null> {
    const { data, error } = await this.supabase
      .from(DATABASE_TABLES.BOOKINGS)
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error) {
      return null;
    }

    return data;
  }
}

/**
 * Create booking service instance
 */
export function createBookingService(supabase: AnySupabaseClient): BookingService {
  return new BookingService(supabase);
}
