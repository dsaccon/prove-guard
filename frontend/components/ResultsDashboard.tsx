"use client";

import { AnalysisResult } from "@/lib/types";
import FunctionCard from "./FunctionCard";

interface Props {
  result: AnalysisResult;
}

export default function ResultsDashboard({ result }: Props) {
  const { summary } = result;

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Functions" value={summary.total_functions} color="text-white" />
        <StatCard label="Proven Safe" value={summary.proven_safe} color="text-green-400" />
        <StatCard label="Potentially Unsafe" value={summary.potentially_unsafe} color="text-red-400" />
        <StatCard label="Inconclusive" value={summary.inconclusive} color="text-yellow-400" />
        <StatCard label="Skipped" value={summary.skipped} color="text-gray-400" />
      </div>

      {/* Function cards */}
      <div className="space-y-4">
        {result.functions.map((func, i) => (
          <FunctionCard key={i} func={func} />
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="border border-gray-700 rounded-lg p-3 text-center bg-gray-900/50">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
