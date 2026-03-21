"use client";

import { useState } from "react";
import { FunctionResult, PropertyResult } from "@/lib/types";

const VERDICT_STYLES = {
  proven_safe: { bg: "bg-green-900/30", border: "border-green-700", text: "text-green-400", label: "Proven Safe" },
  potentially_unsafe: { bg: "bg-red-900/30", border: "border-red-700", text: "text-red-400", label: "Potentially Unsafe" },
  inconclusive: { bg: "bg-yellow-900/30", border: "border-yellow-700", text: "text-yellow-400", label: "Inconclusive" },
};

const PROPERTY_LABELS: Record<string, string> = {
  division_by_zero: "Division by Zero",
  index_out_of_bounds: "Index Out of Bounds",
  none_dereference: "None Dereference",
};

function PropertyBadge({ result }: { result: PropertyResult }) {
  const [expanded, setExpanded] = useState(false);
  const style = VERDICT_STYLES[result.verdict];

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} p-3`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <span className="text-sm text-gray-300">{PROPERTY_LABELS[result.type]}</span>
        <span className={`text-sm font-medium ${style.text}`}>{style.label}</span>
      </button>
      {expanded && (
        <div className="mt-3 space-y-2">
          <div>
            <p className="text-xs text-gray-500 mb-1">Lean 4 Code</p>
            <pre className="text-xs bg-black/50 p-3 rounded overflow-x-auto text-gray-300">
              {result.lean_code}
            </pre>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Compiler Output</p>
            <pre className="text-xs bg-black/50 p-3 rounded overflow-x-auto text-gray-300">
              {result.compiler_output}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FunctionCard({ func }: { func: FunctionResult }) {
  return (
    <div className="border border-gray-700 rounded-xl p-5 bg-gray-900/50">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-mono font-medium text-white">{func.name}</h3>
          <p className="text-sm text-gray-500">{func.file_path}</p>
        </div>
      </div>
      <pre className="text-sm bg-black/50 p-3 rounded-lg overflow-x-auto text-gray-300 mb-4">
        {func.source_code}
      </pre>
      <div className="space-y-2">
        {func.properties.map((prop, i) => (
          <PropertyBadge key={i} result={prop} />
        ))}
      </div>
    </div>
  );
}
