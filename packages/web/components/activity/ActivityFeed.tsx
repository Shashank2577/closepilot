import React from 'react';
import { ActivityItem } from './ActivityItem';
import { useActivityStream } from './useActivityStream';

interface ActivityFeedProps {
  limit?: number;
  refreshInterval?: number;
}

/**
 * Feed showing activities across all deals
 * Displays real-time updates via SSE stream
 */
export function ActivityFeed({ limit = 50 }: ActivityFeedProps) {
  const { activities, isConnected, isLive, error } = useActivityStream({
    autoReconnect: true,
  });

  const displayedActivities = limit ? activities.slice(0, limit) : activities;

  return (
    <div className="space-y-4">
      {/* Header with Live Indicator */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Activity Feed</h2>
          <p className="text-sm text-gray-600">Real-time updates across all deals</p>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-full">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isConnected
                ? isLive
                  ? 'bg-green-500 animate-pulse'
                  : 'bg-green-500'
                : 'bg-gray-400'
            }`}
          />
          <span className="text-sm font-medium text-gray-700">
            {isConnected ? (isLive ? 'Live' : 'Connected') : 'Reconnecting...'}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-red-500 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {displayedActivities.length === 0 && !error && (
        <div className="p-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="text-gray-500 text-lg font-medium mb-1">No activities yet</p>
          <p className="text-gray-400 text-sm">
            Activities will appear here as agents process deals
          </p>
        </div>
      )}

      {/* Activities Grid */}
      {displayedActivities.length > 0 && (
        <div className="grid gap-4">
          {displayedActivities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} showDealLink={true} />
          ))}
        </div>
      )}

      {/* Load More Indicator */}
      {limit && activities.length > limit && (
        <div className="text-center pt-6">
          <p className="text-sm text-gray-500">
            Showing {limit} of {activities.length} total activities
          </p>
        </div>
      )}

      {/* Activity Stats */}
      {displayedActivities.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Total activities: {activities.length}</span>
            <span className={isConnected ? 'text-green-600' : 'text-gray-500'}>
              {isConnected ? '● Real-time updates active' : '○ Reconnecting...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
