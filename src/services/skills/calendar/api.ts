/**
 * Google Calendar API Client
 * Handles Google Calendar API requests
 */

import { CalendarOAuthManager } from './oauth';

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string; // ISO 8601
    date?: string; // All-day events (YYYY-MM-DD)
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  recurrence?: string[]; // RFC 5545 recurrence rules
  colorId?: string;
  transparency?: 'opaque' | 'transparent';
  visibility?: 'default' | 'public' | 'private' | 'confidential';
}

export interface CreateEventData {
  summary: string;
  description?: string;
  location?: string;
  start: Date | string;
  end: Date | string;
  allDay?: boolean;
  timeZone?: string;
  attendees?: string[];
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{ method: 'email' | 'popup'; minutes: number }>;
  };
}

/**
 * Google Calendar API Client
 */
export class CalendarAPIClient {
  private oauthManager: CalendarOAuthManager;
  private apiBaseUrl = 'https://www.googleapis.com/calendar/v3';

  constructor(oauthManager: CalendarOAuthManager) {
    this.oauthManager = oauthManager;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.oauthManager.getAccessToken();

    const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Calendar API error: ${error.error || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a calendar event
   */
  async createEvent(data: CreateEventData, calendarId: string = 'primary'): Promise<CalendarEvent> {
    const event = this.prepareEvent(data);
    
    const response = await this.request<CalendarEvent>(`/calendars/${calendarId}/events`, {
      method: 'POST',
      body: JSON.stringify(event),
    });

    return response;
  }

  /**
   * Update a calendar event
   */
  async updateEvent(
    eventId: string,
    data: Partial<CreateEventData>,
    calendarId: string = 'primary'
  ): Promise<CalendarEvent> {
    const event = this.prepareEvent(data as CreateEventData, true);
    
    const response = await this.request<CalendarEvent>(`/calendars/${calendarId}/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(event),
    });

    return response;
  }

  /**
   * Get an event by ID
   */
  async getEvent(eventId: string, calendarId: string = 'primary'): Promise<CalendarEvent> {
    return this.request(`/calendars/${calendarId}/events/${eventId}`);
  }

  /**
   * List events
   */
  async listEvents(
    calendarId: string = 'primary',
    options: {
      timeMin?: string;
      timeMax?: string;
      maxResults?: number;
      singleEvents?: boolean;
      orderBy?: 'startTime' | 'updated';
    } = {}
  ): Promise<{ items: CalendarEvent[] }> {
    const params = new URLSearchParams();
    
    if (options.timeMin) params.append('timeMin', options.timeMin);
    if (options.timeMax) params.append('timeMax', options.timeMax);
    if (options.maxResults) params.append('maxResults', options.maxResults.toString());
    if (options.singleEvents !== undefined) params.append('singleEvents', options.singleEvents.toString());
    if (options.orderBy) params.append('orderBy', options.orderBy);

    return this.request(`/calendars/${calendarId}/events?${params.toString()}`);
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string, calendarId: string = 'primary'): Promise<void> {
    await this.request(`/calendars/${calendarId}/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get calendar list
   */
  async listCalendars(): Promise<{ items: Array<{ id: string; summary: string; timeZone: string }> }> {
    return this.request('/users/me/calendarList');
  }

  /**
   * Prepare event data for API
   */
  private prepareEvent(data: CreateEventData, _isUpdate: boolean = false): Partial<CalendarEvent> {
    const event: Partial<CalendarEvent> = {};

    if (data.summary) event.summary = data.summary;
    if (data.description) event.description = data.description;
    if (data.location) event.location = data.location;

    // Handle dates
    const timeZone = data.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    if (data.allDay) {
      // All-day event
      const startDate = typeof data.start === 'string' ? data.start : formatDate(data.start);
      const endDate = typeof data.end === 'string' ? data.end : formatDate(data.end);
      
      event.start = { date: startDate, timeZone };
      event.end = { date: endDate, timeZone };
    } else {
      // Timed event
      const startDateTime = typeof data.start === 'string' ? data.start : data.start.toISOString();
      const endDateTime = typeof data.end === 'string' ? data.end : data.end.toISOString();
      
      event.start = { dateTime: startDateTime, timeZone };
      event.end = { dateTime: endDateTime, timeZone };
    }

    // Handle attendees
    if (data.attendees && data.attendees.length > 0) {
      event.attendees = data.attendees.map(email => ({
        email,
        responseStatus: 'needsAction',
      }));
    }

    // Handle reminders
    if (data.reminders) {
      event.reminders = data.reminders;
    }

    return event;
  }
}

/**
 * Format date as YYYY-MM-DD for all-day events
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

