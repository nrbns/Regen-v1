/**
 * Calendar Skill UI Component
 * UI for creating calendar events and scheduling meetings
 */

import { useState, useEffect } from 'react';
import { Calendar, Loader2, Clock, MapPin, Users, X } from 'lucide-react';
import { getCalendarSkill } from '../../services/skills/calendar/skill';
import { extractMeetingDetails } from '../../services/skills/calendar/meetingExtractor';
import type { SkillContext } from '../../services/skills/types';
import { toast } from '../../utils/toast';
import { useMobileDetection } from '../../mobile';

interface CalendarSkillUIProps {
  context?: SkillContext;
  onClose?: () => void;
}

export function CalendarSkillUI({ context, onClose }: CalendarSkillUIProps) {
  const { isMobile } = useMobileDetection();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [attendees, setAttendees] = useState('');
  const [allDay, setAllDay] = useState(false);

  const calendarSkill = getCalendarSkill();

  // Check authorization on mount
  useEffect(() => {
    checkAuthorization();
    loadPageContext();
  }, [context]);

  // Set default times
  useEffect(() => {
    if (!startDate && !endDate) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);

      const end = new Date(tomorrow);
      end.setHours(15, 0, 0, 0);

      setStartDate(tomorrow.toISOString().split('T')[0]);
      setStartTime(tomorrow.toTimeString().slice(0, 5));
      setEndDate(end.toISOString().split('T')[0]);
      setEndTime(end.toTimeString().slice(0, 5));
    }
  }, []);

  const checkAuthorization = async () => {
    try {
      const authorized = await calendarSkill.isAuthorized();
      setIsAuthorized(authorized);
    } catch {
      setIsAuthorized(false);
    }
  };

  const loadPageContext = async () => {
    if (!context?.pageContent) return;

    try {
      const meetingDetails = extractMeetingDetails(context.pageContent, context.pageTitle);

      if (meetingDetails.title) setSummary(meetingDetails.title);
      if (meetingDetails.description) setDescription(meetingDetails.description);
      if (meetingDetails.location) setLocation(meetingDetails.location);
      if (meetingDetails.attendees && meetingDetails.attendees.length > 0) {
        setAttendees(meetingDetails.attendees.join(', '));
      }

      if (meetingDetails.date) {
        const date = meetingDetails.date;
        setStartDate(date.toISOString().split('T')[0]);
        if (meetingDetails.time) {
          setStartTime(meetingDetails.time);
        }

        // Set end time
        const duration = meetingDetails.duration || 60;
        const endDate = new Date(date);
        endDate.setMinutes(endDate.getMinutes() + duration);
        setEndDate(endDate.toISOString().split('T')[0]);
        setEndTime(endDate.toTimeString().slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to extract meeting details:', error);
    }
  };

  const handleAuthorize = async () => {
    setIsAuthorizing(true);
    try {
      const config = {
        clientId: process.env.VITE_CALENDAR_CLIENT_ID || '',
        redirectUri: `${window.location.origin}/oauth/calendar/callback`,
      };

      await calendarSkill.initialize(config);
      await calendarSkill.authorize();
      setIsAuthorized(true);
      toast.success('Calendar authorized successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to authorize Calendar');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!summary) {
      toast.error('Please enter an event title');
      return;
    }

    if (!startDate || !endDate) {
      toast.error('Please enter start and end dates');
      return;
    }

    setIsCreating(true);
    try {
      // Parse dates and times
      const start = new Date(`${startDate}T${allDay ? '00:00:00' : startTime || '00:00:00'}`);
      const end = new Date(`${endDate}T${allDay ? '23:59:59' : endTime || '00:00:00'}`);

      const result = await calendarSkill.createEvent(context || createDefaultContext(), {
        summary,
        description: description || undefined,
        location: location || undefined,
        start,
        end,
        allDay,
        attendees: attendees
          ? attendees
              .split(',')
              .map(email => email.trim())
              .filter(Boolean)
          : undefined,
      });

      if (result.success) {
        toast.success('Calendar event created successfully');
        onClose?.();
      } else {
        toast.error(result.error || 'Failed to create event');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create event');
    } finally {
      setIsCreating(false);
    }
  };

  const createDefaultContext = (): SkillContext => ({
    skillId: 'regen-calendar',
    pageUrl: window.location.href,
    pageTitle: document.title,
    pageContent: document.body.innerText,
    permissions: [],
  });

  if (!isAuthorized) {
    return (
      <div className={`${isMobile ? 'p-4' : 'p-6'} rounded-lg border border-gray-700 bg-gray-900`}>
        <div className="mb-4 flex items-center gap-3">
          <Calendar className="h-6 w-6 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Calendar Integration</h3>
        </div>
        <p className="mb-6 text-gray-400">
          Authorize Google Calendar to create events and schedule meetings.
        </p>
        <button
          onClick={handleAuthorize}
          disabled={isAuthorizing}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAuthorizing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Authorizing...
            </>
          ) : (
            <>
              <Calendar className="h-5 w-5" />
              Authorize Calendar
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`${isMobile ? 'p-4' : 'p-6'} w-full max-w-2xl rounded-lg border border-gray-700 bg-gray-900`}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Create Calendar Event</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">Event Title *</label>
          <input
            type="text"
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder="Meeting with team"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-base text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Event description"
            rows={3}
            className="w-full resize-y rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-base text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block flex items-center gap-2 text-sm font-medium text-gray-300">
            <MapPin className="h-4 w-4" />
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Meeting room or address"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-base text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="allDay"
            checked={allDay}
            onChange={e => setAllDay(e.target.checked)}
            className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="allDay" className="text-sm text-gray-300">
            All-day event
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block flex items-center gap-2 text-sm font-medium text-gray-300">
              <Clock className="h-4 w-4" />
              Start
            </label>
            <div className="space-y-2">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-base text-white focus:border-indigo-500 focus:outline-none"
              />
              {!allDay && (
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-base text-white focus:border-indigo-500 focus:outline-none"
                />
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">End</label>
            <div className="space-y-2">
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-base text-white focus:border-indigo-500 focus:outline-none"
              />
              {!allDay && (
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-base text-white focus:border-indigo-500 focus:outline-none"
                />
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block flex items-center gap-2 text-sm font-medium text-gray-300">
            <Users className="h-4 w-4" />
            Attendees (comma-separated emails)
          </label>
          <input
            type="text"
            value={attendees}
            onChange={e => setAttendees(e.target.value)}
            placeholder="email1@example.com, email2@example.com"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-base text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={handleCreateEvent}
          disabled={isCreating}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Creating Event...
            </>
          ) : (
            <>
              <Calendar className="h-5 w-5" />
              Create Event
            </>
          )}
        </button>
      </div>
    </div>
  );
}
