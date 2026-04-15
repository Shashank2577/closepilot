import React from 'react';
import { ActivityItem } from './ActivityItem';
import { useActivityStream } from './useActivityStream';

interface ActivityTimelineProps {
  dealId: number;
  limit?: number;
}

/**
 * Timeline for activities for a single deal
 * Shows real-time updates via SSE stream
 */
export function ActivityTimeline({ dealId, limit }: ActivityTimelineProps) {
  const { activities, isConnected, isLive, error } = useActivityStream({
    dealId,
    autoReconnect: true,
  });

  const displayedActivities = limit ? activities.slice(0, limit) : activities;

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Activity Timeline</h2>
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? (isLive ? 'bg-green-500 animate-pulse' : 'bg-green-500') : 'bg-gray-400'
            }`}
          />
          <span className="text-sm text-gray-600">
            {isConnected ? (isLive ? 'Live' : 'Connected') : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">Error: {error}</p>
        </div>
      )}

      {/* Activities */}
      {displayedActivities.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-lg">
          <p className="text-gray-500">No activities yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedActivities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
      )}

      {/* Load More Indicator */}
      {limit && activities.length > limit && (
        <div className="text-center pt-4">
          <p className="text-sm text-gray-500">
            Showing {limit} of {activities.length} activities
          </p>
        </div>
      )}
    </div>
  );
}
