import { useState, useEffect, useRef, useCallback } from 'react';

interface Activity {
  id: number;
  dealId: number;
  agentType: string;
  activityType: string;
  description: string;
  metadata?: string;
  createdAt: string;
}

interface UseActivityStreamOptions {
  dealId?: number;
  autoReconnect?: boolean;
  reconnectDelay?: number;
}

interface UseActivityStreamReturn {
  activities: Activity[];
  isConnected: boolean;
  isLive: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
}

/**
 * Hook for SSE connection to activity stream
 * Features: auto-reconnect, live indicator, error handling
 */
export function useActivityStream({
  dealId,
  autoReconnect = true,
  reconnectDelay = 3000,
}: UseActivityStreamOptions = {}): UseActivityStreamReturn {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    setIsConnected(false);
    setIsLive(false);
  }, []);

  const connect = useCallback(() => {
    // Clean up existing connection
    disconnect();

    // Build URL with dealId filter if provided
    // Use a direct API URL - in production this should use environment variable
    const apiOrigin = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const url = new URL('/api/activities/stream', apiOrigin);
    if (dealId) {
      url.searchParams.set('dealId', String(dealId));
    }

    // Create EventSource for SSE
    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;

    // Connection opened
    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    // Handle incoming messages
    eventSource.addEventListener('message', (e) => {
      try {
        const activity: Activity = JSON.parse(e.data);
        setActivities((prev) => [activity, ...prev]);
        setIsLive(true);

        // Reset heartbeat timeout on activity
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
        }

        // Set isLive to false after 5 seconds of no activity
        heartbeatTimeoutRef.current = setTimeout(() => {
          setIsLive(false);
        }, 5000);
      } catch (err) {
        console.error('Failed to parse activity:', err);
      }
    });

    // Handle heartbeat
    eventSource.addEventListener('heartbeat', () => {
      // Keep connection alive
    });

    // Handle errors
    eventSource.onerror = (e) => {
      console.error('SSE error:', e);
      setIsConnected(false);
      setIsLive(false);
      setError('Connection error');

      // Auto-reconnect
      if (autoReconnect) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectDelay);
      }
    };
  }, [dealId, autoReconnect, reconnectDelay, disconnect]);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [dealId]); // Reconnect if dealId changes

  return {
    activities,
    isConnected,
    isLive,
    error,
    connect,
    disconnect,
  };
}
