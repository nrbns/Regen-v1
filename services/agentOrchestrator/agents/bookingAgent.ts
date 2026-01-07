/**
 * Booking Agent Wrapper - Orchestrator Integration
 * Bridges orchestrator with existing booking agent
 */

import { BookingPlanner } from '../../bookingAgent/bookingPlanner';
import { BookingExecutor } from '../../bookingAgent/bookingExecutor';
import { FlightSearchService } from '../../bookingAgent/flightSearchService';

export class BookingAgentHandler {
  private planner: BookingPlanner;
  private executor: BookingExecutor;
  private flightSearch: FlightSearchService;

  constructor() {
    this.planner = new BookingPlanner();
    this.executor = new BookingExecutor();
    this.flightSearch = new FlightSearchService();
  }

  /**
   * Execute booking agent action
   */
  async execute(action: string, parameters: Record<string, any>): Promise<any> {
    console.log(`[BookingAgent] Executing: ${action}`, parameters);

    switch (action) {
      case 'search_options':
        return await this.searchOptions(parameters);

      case 'compare_and_select':
        return await this.compareOptions(parameters);

      case 'complete_booking':
        return await this.completeBooking(parameters);

      case 'search_flights':
        return await this.searchFlights(parameters);

      case 'search_hotels':
        return await this.searchHotels(parameters);

      case 'get_booking_details':
        return await this.getBookingDetails(parameters);

      default:
        throw new Error(`Unknown booking action: ${action}`);
    }
  }

  /**
   * Search for booking options (flights, hotels, etc.)
   */
  private async searchOptions(params: any) {
    const { type, destination, origin, dates, passengers = 1 } = params;

    if (type === 'flight') {
      return await this.searchFlights({
        origin,
        destination,
        departureDate: dates?.departure,
        returnDate: dates?.return,
        passengers,
      });
    } else if (type === 'hotel') {
      return await this.searchHotels({
        destination,
        checkIn: dates?.checkIn,
        checkOut: dates?.checkOut,
        guests: passengers,
      });
    }

    throw new Error(`Unknown booking type: ${type}`);
  }

  /**
   * Search flights
   */
  private async searchFlights(params: any) {
    const { origin, destination, departureDate, returnDate, passengers = 1 } = params;

    // Mock flight results (in production: use real API)
    const options = [
      {
        id: 'flight_1',
        airline: 'Demo Airlines',
        flightNumber: 'DA123',
        origin,
        destination,
        departure: departureDate,
        arrival: departureDate,
        price: 299,
        duration: '2h 30m',
        stops: 0,
      },
      {
        id: 'flight_2',
        airline: 'Budget Air',
        flightNumber: 'BA456',
        origin,
        destination,
        departure: departureDate,
        arrival: departureDate,
        price: 199,
        duration: '3h 45m',
        stops: 1,
      },
    ];

    return {
      success: true,
      action: 'search_flights',
      query: { origin, destination, departureDate, returnDate, passengers },
      options,
      count: options.length,
    };
  }

  /**
   * Search hotels
   */
  private async searchHotels(params: any) {
    const { destination, checkIn, checkOut, guests = 1 } = params;

    // Mock hotel results
    const options = [
      {
        id: 'hotel_1',
        name: 'Grand Hotel',
        location: destination,
        rating: 4.5,
        pricePerNight: 150,
        amenities: ['WiFi', 'Pool', 'Gym'],
      },
      {
        id: 'hotel_2',
        name: 'Budget Inn',
        location: destination,
        rating: 3.8,
        pricePerNight: 80,
        amenities: ['WiFi', 'Parking'],
      },
    ];

    return {
      success: true,
      action: 'search_hotels',
      query: { destination, checkIn, checkOut, guests },
      options,
      count: options.length,
    };
  }

  /**
   * Compare options and recommend best choice
   */
  private async compareOptions(params: any) {
    const { options, preferences: _preferences = {} } = params;

    if (!options || !Array.isArray(options) || options.length === 0) {
      throw new Error('options array required');
    }

    // Simple comparison logic (in production: use AI)
    const scored = options.map((opt: any) => {
      let score = 0;

      // Prefer lower price
      if (opt.price) score += (1000 - opt.price) / 10;

      // Prefer higher ratings
      if (opt.rating) score += opt.rating * 20;

      // Prefer direct flights (no stops)
      if (opt.stops === 0) score += 30;

      return { ...opt, score };
    });

    // Sort by score
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    return {
      success: true,
      action: 'compare_and_select',
      recommended: best,
      reasoning: [
        best.stops === 0 ? 'Direct flight' : `${best.stops} stop(s)`,
        `Price: $${best.price}`,
        best.rating ? `Rating: ${best.rating}/5` : null,
      ].filter(Boolean),
      alternatives: scored.slice(1, 3),
    };
  }

  /**
   * Complete booking (HIGH RISK - requires approval)
   */
  private async completeBooking(params: any) {
    const { selection, paymentInfo: _paymentInfo, contactInfo: _contactInfo } = params;

    if (!selection) {
      throw new Error('selection required for booking');
    }

    // In production: process payment, confirm booking
    console.warn('[BookingAgent] HIGH RISK: Completing booking', selection);

    return {
      success: true,
      action: 'complete_booking',
      bookingId: `BOOK_${Date.now()}`,
      confirmationNumber: `CONF${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      details: selection,
      status: 'confirmed',
      totalCost: selection.price || 0,
      message: 'Booking completed (demo mode - no actual transaction)',
    };
  }

  /**
   * Get booking details
   */
  private async getBookingDetails(params: any) {
    const { bookingId } = params;

    return {
      success: true,
      action: 'get_booking_details',
      bookingId,
      status: 'confirmed',
      details: {
        bookingId,
        type: 'flight',
        status: 'confirmed',
        createdAt: new Date(),
      },
    };
  }
}

export default BookingAgentHandler;
