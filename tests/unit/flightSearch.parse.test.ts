import { describe, it, expect } from 'vitest';
import { FlightSearchService } from '../../services/bookingAgent/flightSearchService';

// Minimal unit tests for parseDuration and mapping

describe('FlightSearchService parsing', () => {
  const svc = new FlightSearchService();

  it('parseDuration handles hours and minutes', () => {
    // @ts-expect-error access private via any for unit test
    const minutes = (svc as any).parseDuration('PT2H30M');
    expect(minutes).toBe(150);
  });

  it('parseDuration handles minutes only', () => {
    // @ts-expect-error access private via any for unit test
    const minutes = (svc as any).parseDuration('PT45M');
    expect(minutes).toBe(45);
  });

  it('parseDuration handles hours only', () => {
    // @ts-expect-error access private via any for unit test
    const minutes = (svc as any).parseDuration('PT3H');
    expect(minutes).toBe(180);
  });

  it('parseDuration returns 0 for invalid format', () => {
    // @ts-expect-error access private via any for unit test
    const minutes = (svc as any).parseDuration('invalid');
    expect(minutes).toBe(0);
  });

  it('maps Amadeus offer into FlightOption with duration and stops', () => {
    const sample = [
      {
        id: 'OFFER1',
        itineraries: [
          {
            duration: 'PT1H20M',
            segments: [
              {
                carrierCode: 'AA',
                number: '100',
                departure: { iataCode: 'JFK', at: '2025-12-15T08:00:00', terminal: '4' },
                arrival: { iataCode: 'BOS', at: '2025-12-15T09:20:00' },
              },
            ],
          },
        ],
        price: { total: '199.99', currency: 'USD' },
        travelerPricings: [
          { fareDetailsBySegment: [{ cabin: 'ECONOMY', includedCheckedBags: { quantity: 1 } }] },
        ],
        numberOfBookableSeats: 5,
      },
    ];
    // @ts-expect-error access private via any for unit test
    const mapped = (svc as any).parseAmadeusResponse(sample);
    expect(mapped).toHaveLength(1);
    expect(mapped[0].id).toBe('OFFER1');
    expect(mapped[0].duration).toBe(80);
    expect(mapped[0].stops).toBe(0);
    expect(mapped[0].price.amount).toBeCloseTo(199.99);
    expect(mapped[0].departure.airport).toBe('JFK');
    expect(mapped[0].arrival.airport).toBe('BOS');
    expect(mapped[0].class).toBe('economy');
    expect(mapped[0].availableSeats).toBe(5);
  });
});
