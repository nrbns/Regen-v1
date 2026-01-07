/**
 * Intent Parser
 * Extracts booking parameters from natural language
 */

import { getCachedLLMClient } from '../llmClient';
import type { FlightSearchParams, HotelSearchParams, CarSearchParams, BookingRequest } from './types';

export class IntentParser {
  /**
   * Parse natural language booking intent
   */
  async parseIntent(userId: string, intent: string): Promise<BookingRequest> {
    const type = this.detectBookingType(intent);

    try {
      const client = getCachedLLMClient();
      const prompt = this.buildPrompt(intent, type);

      const response = await client.chat.completions.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4.5',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3, // Lower for accurate extraction
        max_tokens: 512,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const params = this.parseParams(content, type) as FlightSearchParams | HotelSearchParams | CarSearchParams | undefined;

      return {
        userId,
        intent,
        type,
        params,
      };
    } catch (error) {
      console.warn('[IntentParser] LLM failed, using pattern matching:', error);
      return this.parseWithPatterns(userId, intent, type);
    }
  }

  /**
   * Detect booking type from intent
   */
  private detectBookingType(intent: string): 'flight' | 'hotel' | 'car' | 'package' {
    const lower = intent.toLowerCase();

    if (lower.includes('flight') || lower.includes('fly to') || lower.includes('plane')) {
      return 'flight';
    }
    if (lower.includes('hotel') || lower.includes('stay') || lower.includes('room')) {
      return 'hotel';
    }
    if (lower.includes('car') || lower.includes('rent') || lower.includes('vehicle')) {
      return 'car';
    }
    if (lower.includes('package') || lower.includes('trip')) {
      return 'package';
    }

    // Default: assume flight
    return 'flight';
  }

  /**
   * Build LLM prompt for parameter extraction
   */
  private buildPrompt(intent: string, type: string): string {
    const schemas: Record<string, string> = {
      flight: `{
  "from": "departure airport or city",
  "to": "destination airport or city",
  "departDate": "YYYY-MM-DD",
  "returnDate": "YYYY-MM-DD (optional)",
  "passengers": 1,
  "class": "economy|business|first"
}`,
      hotel: `{
  "location": "city or area",
  "checkIn": "YYYY-MM-DD",
  "checkOut": "YYYY-MM-DD",
  "rooms": 1,
  "guests": 1,
  "starRating": 3
}`,
    };

    return `Extract ${type} booking parameters from this request:

"${intent}"

Return JSON matching this schema:
${schemas[type] || schemas.flight}

Rules:
- Use ISO date format (YYYY-MM-DD)
- Infer missing dates from context (e.g., "next Friday")
- Default passengers/guests to 1
- Use airport codes if recognizable (e.g., SFO, JFK)
- Return only valid JSON, no markdown

JSON:`;
  }

  /**
   * Parse LLM response into typed params
   */
  private parseParams(
    llmResponse: string,
    type: string
  ): FlightSearchParams | HotelSearchParams | Record<string, any> {
    try {
      const cleaned = llmResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (type === 'flight') {
        return this.validateFlightParams(parsed);
      } else if (type === 'hotel') {
        return this.validateHotelParams(parsed);
      }

      return parsed;
    } catch (error) {
      console.error('[IntentParser] Parse error:', error);
      throw new Error('Failed to parse booking parameters');
    }
  }

  /**
   * Validate and normalize flight params
   */
  private validateFlightParams(params: any): FlightSearchParams {
    return {
      from: params.from || '',
      to: params.to || '',
      departDate: params.departDate || this.getDefaultDate(7),
      returnDate: params.returnDate,
      passengers: params.passengers || 1,
      class: params.class || 'economy',
      flexible: params.flexible || false,
    };
  }

  /**
   * Validate and normalize hotel params
   */
  private validateHotelParams(params: any): HotelSearchParams {
    return {
      location: params.location || '',
      checkIn: params.checkIn || this.getDefaultDate(7),
      checkOut: params.checkOut || this.getDefaultDate(10),
      rooms: params.rooms || 1,
      guests: params.guests || 1,
      starRating: params.starRating,
      maxPrice: params.maxPrice,
    };
  }

  /**
   * Fallback: pattern-based parsing
   */
  private parseWithPatterns(
    userId: string,
    intent: string,
    type: 'flight' | 'hotel' | 'car' | 'package'
  ): BookingRequest {
    if (type === 'flight') {
      return {
        userId,
        intent,
        type: 'flight',
        params: {
          from: this.extractLocation(intent, 'from'),
          to: this.extractLocation(intent, 'to'),
          departDate: this.getDefaultDate(7),
          passengers: 1,
          class: 'economy',
        },
      };
    }

    return { userId, intent, type, params: undefined };
  }

  /**
   * Extract location using patterns
   */
  private extractLocation(text: string, direction: 'from' | 'to'): string {
    const patterns = {
      from: /from\s+([A-Za-z\s]+?)\s+to/i,
      to: /to\s+([A-Za-z\s]+?)(?:\s+on|\s+in|\s*$)/i,
    };

    const match = text.match(patterns[direction]);
    return match ? match[1].trim() : '';
  }

  /**
   * Get default date (days from now)
   */
  private getDefaultDate(daysFromNow: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  }
}

export function createIntentParser(): IntentParser {
  return new IntentParser();
}
