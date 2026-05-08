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

export interface Booking {
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

interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

interface CreateBookingParams {
  bookableType: BookableType;
  bookableId: string;
  providerActorId: string;
  customerActorId: string;
  customerUserId: string;
  startsAt: Date;
  endsAt: Date;
  priceBtc: number;
  depositBtc?: number;
  customerNotes?: string;
  metadata?: Record<string, unknown>;
}

interface BookingResult {
  success: boolean;
  booking?: Booking;
  error?: string;
}

/**
 * Booking Service Class
 */
export class BookingService {
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

  /**
   * Get available time slots for a service on a given date
   */
  async getServiceAvailability(serviceId: string, date: Date): Promise<TimeSlot[]> {
    const dayOfWeek = date.getDay();
    const dateString = date.toISOString().split('T')[0];

    // Get recurring slots for this day of week
    const { data: recurringSlots } = await this.supabase
      .from(DATABASE_TABLES.AVAILABILITY_SLOTS)
      .select('*')
      .eq('service_id', serviceId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true);

    // Get specific date slots
    const { data: specificSlots } = await this.supabase
      .from(DATABASE_TABLES.AVAILABILITY_SLOTS)
      .select('*')
      .eq('service_id', serviceId)
      .eq('specific_date', dateString)
      .eq('is_available', true);

    const allSlots = [...(recurringSlots || []), ...(specificSlots || [])];

    // Get existing bookings for this date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: existingBookings } = await this.supabase
      .from(DATABASE_TABLES.BOOKINGS)
      .select('starts_at, ends_at')
      .eq('bookable_type', 'service')
      .eq('bookable_id', serviceId)
      .in('status', [STATUS.BOOKINGS.CONFIRMED, STATUS.BOOKINGS.IN_PROGRESS])
      .gte('starts_at', startOfDay.toISOString())
      .lte('starts_at', endOfDay.toISOString());

    // Convert slots to TimeSlot format and check availability
    const timeSlots: TimeSlot[] = [];

    for (const slot of allSlots) {
      const [startHour, startMin] = slot.start_time.split(':').map(Number);
      const [endHour, endMin] = slot.end_time.split(':').map(Number);

      const slotStart = new Date(date);
      slotStart.setHours(startHour, startMin, 0, 0);

      const slotEnd = new Date(date);
      slotEnd.setHours(endHour, endMin, 0, 0);

      // Check if slot conflicts with existing bookings
      const isConflicted = existingBookings?.some(booking => {
        const bookingStart = new Date(booking.starts_at);
        const bookingEnd = new Date(booking.ends_at);
        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });

      timeSlots.push({
        start: slotStart,
        end: slotEnd,
        available: !isConflicted && slot.current_bookings < slot.max_bookings,
      });
    }

    return timeSlots.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  /**
   * Get available dates for an asset rental
   */
  async getAssetAvailability(
    assetId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ date: Date; available: boolean }[]> {
    // Get asset availability settings
    const { data: availability } = await this.supabase
      .from(DATABASE_TABLES.ASSET_AVAILABILITY)
      .select('*')
      .eq('asset_id', assetId)
      .eq('is_available', true)
      .single();

    if (!availability) {
      return [];
    }

    // Get existing bookings in the date range
    const { data: existingBookings } = await this.supabase
      .from(DATABASE_TABLES.BOOKINGS)
      .select('starts_at, ends_at')
      .eq('bookable_type', 'asset')
      .eq('bookable_id', assetId)
      .in('status', [STATUS.BOOKINGS.CONFIRMED, STATUS.BOOKINGS.IN_PROGRESS])
      .gte('starts_at', startDate.toISOString())
      .lte('ends_at', endDate.toISOString());

    const blockedDates = availability.blocked_dates || [];
    const results: { date: Date; available: boolean }[] = [];

    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];

      // Check if date is in blocked list
      const isBlocked = blockedDates.some(
        (blocked: { start: string; end: string }) =>
          dateStr >= blocked.start && dateStr <= blocked.end
      );

      // Check if date conflicts with existing booking
      const isBooked = existingBookings?.some(booking => {
        const bookingStart = new Date(booking.starts_at).toISOString().split('T')[0];
        const bookingEnd = new Date(booking.ends_at).toISOString().split('T')[0];
        return dateStr >= bookingStart && dateStr <= bookingEnd;
      });

      // Check if date is within availability range
      const inRange =
        dateStr >= availability.available_from &&
        (!availability.available_to || dateStr <= availability.available_to);

      results.push({
        date: new Date(current),
        available: !isBlocked && !isBooked && inRange,
      });

      current.setDate(current.getDate() + 1);
    }

    return results;
  }

  /**
   * Create a new booking
   */
  async createBooking(params: CreateBookingParams): Promise<BookingResult> {
    const {
      bookableType,
      bookableId,
      providerActorId,
      customerActorId,
      customerUserId,
      startsAt,
      endsAt,
      priceBtc,
      depositBtc = 0,
      customerNotes,
      metadata,
    } = params;

    // Check for conflicts using database function
    const { data: hasConflict } = await this.supabase.rpc('check_booking_conflict', {
      p_bookable_type: bookableType,
      p_bookable_id: bookableId,
      p_starts_at: startsAt.toISOString(),
      p_ends_at: endsAt.toISOString(),
    });

    if (hasConflict) {
      return {
        success: false,
        error: 'This time slot is no longer available',
      };
    }

    // Calculate duration
    const durationMinutes = Math.round((endsAt.getTime() - startsAt.getTime()) / (1000 * 60));

    // Create the booking
    const { data: booking, error } = await this.supabase
      .from(DATABASE_TABLES.BOOKINGS)
      .insert({
        bookable_type: bookableType,
        bookable_id: bookableId,
        provider_actor_id: providerActorId,
        customer_actor_id: customerActorId,
        customer_user_id: customerUserId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        duration_minutes: durationMinutes,
        price_btc: priceBtc,
        deposit_btc: depositBtc,
        customer_notes: customerNotes,
        metadata,
        status: STATUS.BOOKINGS.PENDING,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating booking', { error }, 'BookingService');
      return {
        success: false,
        error: 'Failed to create booking',
      };
    }

    return {
      success: true,
      booking,
    };
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
