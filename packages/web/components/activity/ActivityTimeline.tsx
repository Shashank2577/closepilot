import React from 'react';
import { ActivityItem, Activity } from './ActivityItem';

interface ActivityTimelineProps {
  activities: Activity[];
  dealId?: number;
}

export function ActivityTimeline({ activities, dealId }: ActivityTimelineProps) {
  const filteredActivities = dealId
    ? activities.filter((a) => a.dealId === parseInt(dealId.toString()))
    : activities;

  if (filteredActivities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No activities yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredActivities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}
