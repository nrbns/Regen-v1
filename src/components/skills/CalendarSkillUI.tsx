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
        attendees: attendees ? attendees.split(',').map(email => email.trim()).filter(Boolean) : undefined,
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
      <div className={`${isMobile ? 'p-4' : 'p-6'} bg-gray-900 rounded-lg border border-gray-700`}>
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-6 h-6 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Calendar Integration</h3>
        </div>
        <p className="text-gray-400 mb-6">
          Authorize Google Calendar to create events and schedule meetings.
        </p>
        <button
          onClick={handleAuthorize}
          disabled={isAuthorizing}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {isAuthorizing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Authorizing...
            </>
          ) : (
            <>
              <Calendar className="w-5 h-5" />
              Authorize Calendar
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'p-4' : 'p-6'} bg-gray-900 rounded-lg border border-gray-700 max-w-2xl w-full`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Create Calendar Event</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800 min-w-[32px] min-h-[32px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Event Title *</label>
          <input
            type="text"
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder="Meeting with team"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Event description"
            rows={3}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-y text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Meeting room or address"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-base"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="allDay"
            checked={allDay}
            onChange={e => setAllDay(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="allDay" className="text-sm text-gray-300">
            All-day event
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Start
            </label>
            <div className="space-y-2">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-base"
              />
              {!allDay && (
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-base"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">End</label>
            <div className="space-y-2">
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-base"
              />
              {!allDay && (
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-base"
                />
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Attendees (comma-separated emails)
          </label>
          <input
            type="text"
            value={attendees}
            onChange={e => setAttendees(e.target.value)}
            placeholder="email1@example.com, email2@example.com"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-base"
          />
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={handleCreateEvent}
          disabled={isCreating}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating Event...
            </>
          ) : (
            <>
              <Calendar className="w-5 h-5" />
              Create Event
            </>
          )}
        </button>
      </div>
    </div>
  );
}

