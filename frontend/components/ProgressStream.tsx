"use client";

import { ProgressEvent } from "@/lib/types";

interface Props {
  events: ProgressEvent[];
}

const STEP_LABELS: Record<string, string> = {
  cloning: "Cloning repository",
  extracting: "Extracting functions",
  translating: "Generating Lean proofs",
  verifying: "Verifying with Lean compiler",
};

export default function ProgressStream({ events }: Props) {
  const latestEvent = events[events.length - 1];

  return (
    <div className="w-full max-w-2xl space-y-3">
      <div className="flex items-center gap-3">
        <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
        <span className="text-gray-300">{latestEvent?.message}</span>
      </div>
      <div className="flex gap-2">
        {Object.keys(STEP_LABELS).map((step) => {
          const isActive = latestEvent?.step === step;
          const isPast = Object.keys(STEP_LABELS).indexOf(step) <
            Object.keys(STEP_LABELS).indexOf(latestEvent?.step || "");

          return (
            <div
              key={step}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                isPast ? "bg-blue-500" : isActive ? "bg-blue-400 animate-pulse" : "bg-gray-700"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
