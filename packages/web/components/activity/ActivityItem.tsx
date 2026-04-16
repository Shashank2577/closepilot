import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ActivityIcon } from './ActivityIcon';

export interface Activity {
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
  showDeal?: boolean;
}

export function ActivityItem({ activity, showDeal = false }: ActivityItemProps) {
  const metadata = activity.metadata ? JSON.parse(activity.metadata) : null;

  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <ActivityIcon agentType={activity.agentType as any} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium text-gray-900 capitalize">
            {activity.agentType.replace(/_/g, ' ')}
          </p>
          <span className="text-xs text-gray-500">•</span>
          <p className="text-xs text-gray-500 capitalize">
            {activity.activityType.replace(/_/g, ' ')}
          </p>
        </div>

        <p className="text-sm text-gray-700 mb-1">{activity.description}</p>

        {showDeal && (
          <p className="text-xs text-gray-500 mb-1">Deal #{activity.dealId}</p>
        )}

        <p className="text-xs text-gray-400">
          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
        </p>

        {metadata && Object.keys(metadata).length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
              View details
            </summary>
            <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
              {JSON.stringify(metadata, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
