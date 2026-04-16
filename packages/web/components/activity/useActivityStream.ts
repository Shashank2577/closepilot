import { useState, useEffect, useCallback } from 'react';
import { Activity } from './ActivityItem';

export function useActivityStream() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connect = () => {
      eventSource = new EventSource('/api/activities/stream');

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      eventSource.addEventListener('message', (e) => {
        try {
          const activity = JSON.parse(e.data);
          setActivities((prev) => [activity, ...prev]);
        } catch (err) {
          console.error('Failed to parse activity:', err);
        }
      });

      eventSource.addEventListener('connected', () => {
        console.log('SSE connected');
      });

      eventSource.addEventListener('heartbeat', () => {
        // Keep connection alive
      });

      eventSource.onerror = (err) => {
        console.error('SSE error:', err);
        setError('Connection lost. Reconnecting...');
        setIsConnected(false);

        // Auto-reconnect after 3 seconds
        setTimeout(() => {
          if (eventSource?.readyState === EventSource.CLOSED) {
            connect();
          }
        }, 3000);
      };
    };

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  return { activities, isConnected, error };
}
