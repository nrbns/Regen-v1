import React from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ConsentEvent {
  id: string;
  timestamp: Date;
  type: 'granted' | 'revoked' | 'requested' | 'expired';
  domain: string;
  description: string;
}

interface ConsentTimelineViewProps {
  events?: ConsentEvent[];
}

export function ConsentTimelineView({ events = [] }: ConsentTimelineViewProps) {
  const mockEvents: ConsentEvent[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 3600000),
      type: 'granted',
      domain: 'example.com',
      description: 'Granted cookie consent',
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 7200000),
      type: 'requested',
      domain: 'analytics.example.com',
      description: 'Cookie consent requested',
    },
  ];

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'granted':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'revoked':
        return <XCircle className="h-5 w-5 text-red-400" />;
      case 'expired':
        return <AlertCircle className="h-5 w-5 text-yellow-400" />;
      default:
        return <Clock className="h-5 w-5 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Clock className="h-5 w-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-slate-200">Consent Timeline</h3>
      </div>

      <div className="space-y-4">
        {(events.length > 0 ? events : mockEvents).map((event) => (
          <div key={event.id} className="flex items-start space-x-4">
            <div className="flex-shrink-0 mt-1">
              {getEventIcon(event.type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-slate-200">{event.domain}</h4>
                <span className="text-xs text-slate-400">
                  {event.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">{event.description}</p>
              <div className="flex items-center mt-2">
                <span className={`text-xs px-2 py-1 rounded capitalize ${
                  event.type === 'granted'
                    ? 'bg-green-500/20 text-green-400'
                    : event.type === 'revoked'
                    ? 'bg-red-500/20 text-red-400'
                    : event.type === 'expired'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {event.type}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}