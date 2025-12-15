/**
 * Meeting Extractor for Calendar
 * Extracts meeting information from page content
 */

export interface Meeting {
  title: string;
  date: Date;
  time?: string;
  duration?: number;
  attendees?: string[];
  description?: string;
}

export function extractMeetings(): Meeting[] {
  const meetings: Meeting[] = [];
  
  // Look for common meeting patterns
  const meetingPatterns = [
    /meeting[:\s]+([^,\n]+)/gi,
    /call[:\s]+([^,\n]+)/gi,
    /conference[:\s]+([^,\n]+)/gi,
  ];

  const pageContent = document.body.innerText;
  
  meetingPatterns.forEach(pattern => {
    const matches = pageContent.matchAll(pattern);
    for (const match of matches) {
      meetings.push({
        title: match[1]?.trim() || 'Meeting',
        date: new Date(),
      });
    }
  });

  return meetings;
}

/**
 * Extract attendees from page
 */
export function extractAttendees(): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const content = document.body.innerText;
  return [...new Set(content.match(emailRegex) || [])];
}
