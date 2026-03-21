"use client";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function MethodologyModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full mx-4 p-8 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">How Prove Guard Works</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="space-y-6 text-gray-300">
          {/* Pipeline */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Pipeline</h3>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-3 flex-wrap">
              <span className="bg-gray-800 px-2 py-1 rounded">Clone repo</span>
              <span>&rarr;</span>
              <span className="bg-gray-800 px-2 py-1 rounded">Extract functions (AST)</span>
              <span>&rarr;</span>
              <span className="bg-gray-800 px-2 py-1 rounded">Classify properties</span>
              <span>&rarr;</span>
              <span className="bg-gray-800 px-2 py-1 rounded">Gemini translates to Lean 4</span>
              <span>&rarr;</span>
              <span className="bg-gray-800 px-2 py-1 rounded">Lean compiler verifies</span>
            </div>
          </div>

          {/* Safety Properties */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Safety Properties Checked</h3>
            <div className="space-y-4">
              <div className="border border-gray-700 rounded-lg p-4">
                <h4 className="font-mono text-blue-400 font-medium mb-1">1. Division by Zero</h4>
                <p className="text-sm mb-2">
                  Detects <code className="bg-gray-800 px-1 rounded">/</code>, <code className="bg-gray-800 px-1 rounded">//</code>, <code className="bg-gray-800 px-1 rounded">%</code> operators in the AST. Generates a Lean 4 theorem proving the divisor is never zero for all valid inputs.
                </p>
                <p className="text-xs text-gray-500">
                  Example: <code>def avg(items): return sum(items) / len(items)</code> &rarr; Can len(items) be 0? Yes &rarr; Potentially Unsafe
                </p>
              </div>

              <div className="border border-gray-700 rounded-lg p-4">
                <h4 className="font-mono text-blue-400 font-medium mb-1">2. Index Out of Bounds</h4>
                <p className="text-sm mb-2">
                  Detects subscript access like <code className="bg-gray-800 px-1 rounded">list[i]</code> or <code className="bg-gray-800 px-1 rounded">dict[key]</code>. Generates a Lean 4 theorem proving all indices are within valid bounds.
                </p>
                <p className="text-xs text-gray-500">
                  Example: <code>def first(items): return items[0]</code> &rarr; Can items be empty? Yes &rarr; Potentially Unsafe
                </p>
              </div>

              <div className="border border-gray-700 rounded-lg p-4">
                <h4 className="font-mono text-blue-400 font-medium mb-1">3. None Dereference</h4>
                <p className="text-sm mb-2">
                  Detects parameters with <code className="bg-gray-800 px-1 rounded">None</code> defaults, or calls to <code className="bg-gray-800 px-1 rounded">.get()</code>, <code className="bg-gray-800 px-1 rounded">.find()</code> that can return None. Proves the value is not None at point of use.
                </p>
                <p className="text-xs text-gray-500">
                  Example: <code>def process(x=None): return x.strip()</code> &rarr; Can x be None? Yes &rarr; Potentially Unsafe
                </p>
              </div>
            </div>
          </div>

          {/* Verdicts */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Verdict Meanings</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-medium whitespace-nowrap">Proven Safe</span>
                <span>Lean 4 compiler successfully verified the proof. The property holds mathematically for all inputs.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-red-400 font-medium whitespace-nowrap">Potentially Unsafe</span>
                <span>Lean rejected the proof or the proof required <code className="bg-gray-800 px-1 rounded">sorry</code> (an unproven assumption). The property may not hold &mdash; a potential bug.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-yellow-400 font-medium whitespace-nowrap">Inconclusive</span>
                <span>Lean errored out (syntax issue, timeout, or translation too complex). Cannot determine safety.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gray-400 font-medium whitespace-nowrap">Skipped</span>
                <span>Function has no relevant safety properties (no division, indexing, or None patterns detected).</span>
              </div>
            </div>
          </div>

          {/* Tech */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Tech Stack</h3>
            <p className="text-sm">
              <strong>Gemini 3.1 Pro</strong> translates Python functions into Lean 4 theorems. The <strong>Lean 4 compiler</strong> then mathematically verifies each proof. This is real formal verification &mdash; not AI guessing, but machine-checked mathematical proofs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
