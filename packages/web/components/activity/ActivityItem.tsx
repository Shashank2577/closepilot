import React from 'react';
import { ActivityIcon } from './ActivityIcon';

interface Activity {
  id: number;
  dealId: number;
  agentType: string;
  activityType: string;
  description: string;
  metadata?: string;
  createdAt: string;
}

interface ActivityItemProps {
  activity: Activity;
  showDealLink?: boolean;
}

/**
 * Single activity item with icon, description, and timestamp
 */
export function ActivityItem({ activity, showDealLink = false }: ActivityItemProps) {
  const parseMetadata = (metadata?: string) => {
    if (!metadata) return null;
    try {
      return JSON.parse(metadata);
    } catch {
      return null;
    }
  };

  const metadata = parseMetadata(activity.metadata);
  const timeAgo = new Date(activity.createdAt).toLocaleString();

  return (
    <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      {/* Icon */}
      <ActivityIcon agentType={activity.agentType} size={40} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-gray-900 capitalize">
            {activity.agentType.replace('_', ' ')}
          </p>
          <time className="text-xs text-gray-500">{timeAgo}</time>
        </div>

        <p className="text-sm text-gray-700 mb-2">{activity.description}</p>

        {/* Metadata display */}
        {metadata && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
            {Object.entries(metadata).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="font-medium">{key}:</span>
                <span className="truncate">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Activity type badge */}
        <div className="mt-2">
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
            {activity.activityType.replace('_', ' ').toUpperCase()}
          </span>
          {showDealLink && (
            <a
              href={`/deals/${activity.dealId}`}
              className="ml-2 text-xs text-blue-600 hover:text-blue-800"
            >
              View Deal →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
