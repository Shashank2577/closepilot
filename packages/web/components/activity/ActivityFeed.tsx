import React from 'react';
import { ActivityTimeline } from './ActivityTimeline';
import { useActivityStream } from './useActivityStream';

interface ActivityFeedProps {
  dealId?: number;
  limit?: number;
}

export function ActivityFeed({ dealId, limit }: ActivityFeedProps) {
  const { activities, isConnected, error } = useActivityStream();

  const displayActivities = limit ? activities.slice(0, limit) : activities;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Activity Feed</h3>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs text-gray-600">Live</span>
            </div>
          ) : error ? (
            <span className="text-xs text-red-500">{error}</span>
          ) : (
            <span className="text-xs text-gray-500">Connecting...</span>
          )}
        </div>
      </div>

      <ActivityTimeline activities={displayActivities} dealId={dealId} />
    </div>
  );
}
