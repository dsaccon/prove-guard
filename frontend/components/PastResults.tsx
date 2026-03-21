"use client";

import { AnalysisResult } from "@/lib/types";

interface SavedResult {
  result: AnalysisResult;
  timestamp: string;
}

interface Props {
  results: SavedResult[];
  onView: (saved: SavedResult) => void;
}

function repoName(url: string): string {
  try {
    const parts = url.replace(/\.git$/, "").split("/");
    return parts.slice(-2).join("/");
  } catch {
    return url;
  }
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function PastResults({ results, onView }: Props) {
  return (
    <div className="w-full max-w-2xl">
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
        Past Analyses
      </h2>
      <div className="space-y-2">
        {results.map((saved, i) => {
          const s = saved.result.summary;
          return (
            <button
              key={i}
              onClick={() => onView(saved)}
              className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-800 bg-gray-900/50 hover:border-gray-600 transition-colors text-left"
            >
              <div>
                <p className="font-mono text-sm text-white">
                  {repoName(saved.result.repo_url)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {timeAgo(saved.timestamp)}
                </p>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="text-green-400">{s.proven_safe} safe</span>
                <span className="text-red-400">{s.potentially_unsafe} unsafe</span>
                <span className="text-yellow-400">{s.inconclusive} inconclusive</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
