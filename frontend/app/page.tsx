"use client";

import { useState, useEffect } from "react";
import AnalyzeForm from "@/components/AnalyzeForm";
import ProgressStream from "@/components/ProgressStream";
import ResultsDashboard from "@/components/ResultsDashboard";
import PastResults from "@/components/PastResults";
import MethodologyModal from "@/components/MethodologyModal";
import { AnalysisResult, ProgressEvent } from "@/lib/types";

interface SavedResult {
  result: AnalysisResult;
  timestamp: string;
}

function loadPastResults(): SavedResult[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("prove-guard-results");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveResult(result: AnalysisResult) {
  try {
    const past = loadPastResults();
    // Avoid duplicates for same repo
    const filtered = past.filter((r) => r.result.repo_url !== result.repo_url);
    const updated = [
      { result, timestamp: new Date().toISOString() },
      ...filtered,
    ].slice(0, 10); // Keep last 10
    localStorage.setItem("prove-guard-results", JSON.stringify(updated));
  } catch {
    // localStorage full or unavailable
  }
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pastResults, setPastResults] = useState<SavedResult[]>([]);
  const [showMethodology, setShowMethodology] = useState(false);

  useEffect(() => {
    setPastResults(loadPastResults());
  }, []);

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    setEvents([]);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: url }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to start analysis");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event: ProgressEvent = JSON.parse(line);
            setEvents((prev) => [...prev, event]);

            if (event.step === "done" && event.result) {
              setResult(event.result);
              saveResult(event.result);
              setPastResults(loadPastResults());
            } else if (event.step === "error") {
              setError(event.message);
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewPast = (saved: SavedResult) => {
    setResult(saved.result);
    setError(null);
    setEvents([]);
    setIsLoading(false);
  };

  const handleBack = () => {
    setResult(null);
    setError(null);
    setEvents([]);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3">Prove Guard</h1>
        <p className="text-gray-400 text-lg max-w-xl">
          Formal verification for Python, powered by AI. Paste a GitHub repo and get mathematical proofs about your code&apos;s safety.
        </p>
        <button
          onClick={() => setShowMethodology(true)}
          className="mt-3 text-sm text-blue-400 hover:text-blue-300 underline underline-offset-4 transition-colors"
        >
          How does it work?
        </button>
      </div>

      <AnalyzeForm onSubmit={handleAnalyze} isLoading={isLoading} />

      <div className="mt-10 w-full flex justify-center">
        {isLoading && !result && <ProgressStream events={events} />}

        {error && (
          <div className="w-full max-w-2xl p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {result && (
          <div className="w-full flex flex-col items-center">
            <button
              onClick={handleBack}
              className="mb-4 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              &larr; Back to home
            </button>
            <ResultsDashboard result={result} />
          </div>
        )}

        {!isLoading && !result && !error && pastResults.length > 0 && (
          <PastResults results={pastResults} onView={handleViewPast} />
        )}
      </div>
      <MethodologyModal isOpen={showMethodology} onClose={() => setShowMethodology(false)} />
    </main>
  );
}
