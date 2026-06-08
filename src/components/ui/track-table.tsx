import React from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type TrackTableRow = {
  id: string;
  name: ReactNode;
  artistName: ReactNode;
  albumName?: ReactNode;
  meta?: ReactNode;
};

export function TrackTable({
  tracks,
  caption = "Tracks",
  className
}: {
  tracks: TrackTableRow[];
  caption?: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-[1.25rem] border border-white/10", className)}>
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-white/[0.055] text-xs uppercase tracking-[0.16em] text-platform-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Track
            </th>
            <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
              Album
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Info
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {tracks.map((track) => (
            <tr key={track.id} className="bg-black/12">
              <th scope="row" className="px-4 py-3 font-medium text-white">
                <span className="block">{track.name}</span>
                <span className="mt-1 block text-xs font-normal text-platform-secondary">
                  {track.artistName}
                </span>
              </th>
              <td className="hidden px-4 py-3 text-platform-secondary md:table-cell">
                {track.albumName ?? "-"}
              </td>
              <td className="px-4 py-3 text-right text-platform-secondary">{track.meta ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
