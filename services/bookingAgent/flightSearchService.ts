/**
 * Flight Search Service
 * Integrates with flight booking APIs
 */
import Amadeus from 'amadeus';

import type { FlightSearchParams, FlightOption } from './types';

export class FlightSearchService {
  private amadeus: any;

  constructor() {
    // Initialize Amadeus with credentials from environment
    this.amadeus = new Amadeus({
      clientId: process.env.AMADEUS_CLIENT_ID || '',
      clientSecret: process.env.AMADEUS_CLIENT_SECRET || '',
      hostname: process.env.AMADEUS_ENVIRONMENT === 'production' ? 'production' : 'test',
    });
  }

  /**
   * Search for flights
   */
  async searchFlights(params: FlightSearchParams): Promise<FlightOption[]> {
    console.log(`[FlightSearch] Searching flights: ${params.from} → ${params.to}`);

    try {
      // Use real Amadeus API for flight search
      const response = await this.amadeus.shopping.flightOffersSearch.get({
        originLocationCode: params.from,
        destinationLocationCode: params.to,
        departureDate: params.departDate,
        adults: params.passengers.toString(),
        travelClass: params.class?.toUpperCase() || 'ECONOMY',
        max: '10',
      });

      const flights = this.parseAmadeusResponse(response.data);
      console.log(`[FlightSearch] Found ${flights.length} options`);
      return flights;
    } catch (error) {
      console.error('[FlightSearch] Search failed:', error);
      throw new Error(
        `Flight search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get flight details
   */
  async getFlightDetails(flightId: string): Promise<FlightOption | null> {
    console.log(`[FlightSearch] Getting details for flight ${flightId}`);

    try {
      // Use Amadeus flight offer price API for detailed info
      const response = await this.amadeus.shopping.flightOffers.pricing.post(
        JSON.stringify({
          data: {
            type: 'flight-offers-pricing',
            flightOffers: [{ id: flightId }],
          },
        })
      );

      if (response.data && response.data.length > 0) {
        return this.parseAmadeusResponse([response.data[0]])[0];
      }
      return null;
    } catch (error) {
      console.error('[FlightSearch] Get details failed:', error);
      return null;
    }
  }

  /**
   * Filter flights by criteria
   */
  filterFlights(
    flights: FlightOption[],
    criteria: {
      maxPrice?: number;
      maxStops?: number;
      airlines?: string[];
      departureTimeRange?: { start: number; end: number }; // hours (0-23)
    }
  ): FlightOption[] {
    let filtered = flights;

    if (criteria.maxPrice) {
      filtered = filtered.filter(f => f.price.amount <= criteria.maxPrice!);
    }

    if (criteria.maxStops !== undefined) {
      filtered = filtered.filter(f => f.stops <= criteria.maxStops!);
    }

    if (criteria.airlines && criteria.airlines.length > 0) {
      filtered = filtered.filter(f =>
        criteria.airlines!.some(a => f.airline.toLowerCase().includes(a.toLowerCase()))
      );
    }

    if (criteria.departureTimeRange) {
      filtered = filtered.filter(f => {
        const hour = new Date(f.departure.time).getHours();
        return (
          hour >= criteria.departureTimeRange!.start && hour <= criteria.departureTimeRange!.end
        );
      });
    }

    return filtered;
  }

  /**
   * Sort flights by criteria
   */
  sortFlights(
    flights: FlightOption[],
    sortBy: 'price' | 'duration' | 'stops' | 'departure'
  ): FlightOption[] {
    const sorted = [...flights];

    switch (sortBy) {
      case 'price':
        return sorted.sort((a, b) => a.price.amount - b.price.amount);

      case 'duration':
        return sorted.sort((a, b) => a.duration - b.duration);

      case 'stops':
        return sorted.sort((a, b) => a.stops - b.stops);

      case 'departure':
        return sorted.sort(
          (a, b) => new Date(a.departure.time).getTime() - new Date(b.departure.time).getTime()
        );

      default:
        return sorted;
    }
  }

  /**
   * Parse Amadeus API response into FlightOption format
   */
  private parseAmadeusResponse(data: any[]): FlightOption[] {
    return data.map(offer => {
      const itinerary = offer.itineraries[0];
      const segment = itinerary.segments[0];
      const lastSegment = itinerary.segments[itinerary.segments.length - 1];
      const price = offer.price;

      // Calculate duration in minutes
      const duration = this.parseDuration(itinerary.duration);

      return {
        id: offer.id,
        airline: segment.carrierCode,
        flightNumber: `${segment.carrierCode}${segment.number}`,
        departure: {
          airport: segment.departure.iataCode,
          time: segment.departure.at,
          terminal: segment.departure.terminal || undefined,
        },
        arrival: {
          airport: lastSegment.arrival.iataCode,
          time: lastSegment.arrival.at,
          terminal: lastSegment.arrival.terminal || undefined,
        },
        duration,
        stops: itinerary.segments.length - 1,
        price: {
          amount: parseFloat(price.total),
          currency: price.currency,
        },
        class:
          offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin?.toLowerCase() || 'economy',
        availableSeats: offer.numberOfBookableSeats || 9,
        baggage: {
          carry: 1,
          checked: parseInt(
            offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.includedCheckedBags?.quantity ||
              '1'
          ),
        },
      };
    });
  }

  /**
   * Parse ISO 8601 duration to minutes
   */
  private parseDuration(isoDuration: string): number {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    return hours * 60 + minutes;
  }
}

export function createFlightSearchService(): FlightSearchService {
  return new FlightSearchService();
}
