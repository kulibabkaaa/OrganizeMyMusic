import React from "react";

import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { DashboardActivityItem } from "@/modules/activity/list-activity";

export function RecentActivityCard({ activities }: { activities: DashboardActivityItem[] }) {
  return (
    <Card as="article" className="min-h-48">
      <StatusPill label="Activity" tone="success" />
      <h3 className="mt-4 font-display text-2xl font-semibold tracking-[0em] text-white">
        Recent Activity
      </h3>
      <div className="mt-4 grid gap-3">
        {activities.length > 0 ? (
          activities.slice(0, 3).map((activity) => (
            <p key={activity.id} className="text-sm leading-6 text-platform-secondary">
              <span className="text-white">{activity.label}</span>
              <br />
              {activity.detail}
            </p>
          ))
        ) : (
          <p className="text-sm leading-6 text-platform-secondary">
            Recent library and Sort updates will appear here.
          </p>
        )}
      </div>
    </Card>
  );
}
