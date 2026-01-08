// React Frontend Integration with Tauri IPC
// Place this file at src/lib/tauri-bridge.ts

import { invoke } from '@tauri-apps/api/core';

interface SearchRequest {
  query: string;
  agent_type: 'flight' | 'hotel' | 'booking' | string;
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
}

/**
 * Search across different agent types
 */
export async function search(request: SearchRequest): Promise<SearchResult[]> {
  try {
    return await invoke('search', { request });
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
}

/**
 * Fetch agent configuration
 */
export async function fetchAgent(agentName: string): Promise<string> {
  try {
    return await invoke('fetch_agent', { agent_name: agentName });
  } catch (error) {
    console.error('Fetch agent error:', error);
    throw error;
  }
}

/**
 * Execute a booking
 */
export async function executeBooking(bookingData: Record<string, any>): Promise<string> {
  try {
    return await invoke('execute_booking', { booking_data: bookingData });
  } catch (error) {
    console.error('Booking error:', error);
    throw error;
  }
}

/**
 * Generate a presentation
 */
export async function generatePresentation(topic: string): Promise<string> {
  try {
    return await invoke('generate_presentation', { topic });
  } catch (error) {
    console.error('Presentation generation error:', error);
    throw error;
  }
}

/**
 * Send an email
 */
export async function sendMail(emailData: Record<string, any>): Promise<string> {
  try {
    return await invoke('send_mail', { email_data: emailData });
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

/**
 * Example usage in React component:
 *
 * import { search } from '@/lib/tauri-bridge';
 *
 * const handleSearch = async () => {
 *   const results = await search({
 *     query: 'NYC to London',
 *     agent_type: 'flight'
 *   });
 *   console.log(results);
 * };
 */
