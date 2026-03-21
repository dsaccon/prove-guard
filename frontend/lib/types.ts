export type PropertyType = "division_by_zero" | "index_out_of_bounds" | "none_dereference";
export type VerdictType = "proven_safe" | "potentially_unsafe" | "inconclusive";

export interface PropertyResult {
  type: PropertyType;
  verdict: VerdictType;
  lean_code: string;
  compiler_output: string;
}

export interface FunctionResult {
  name: string;
  file_path: string;
  source_code: string;
  properties: PropertyResult[];
}

export interface Summary {
  total_functions: number;
  proven_safe: number;
  potentially_unsafe: number;
  inconclusive: number;
  skipped: number;
}

export interface AnalysisResult {
  repo_url: string;
  summary: Summary;
  functions: FunctionResult[];
}

export interface ProgressEvent {
  step: "cloning" | "extracting" | "translating" | "verifying" | "done" | "error";
  message: string;
  count?: number;
  current?: number;
  total?: number;
  result?: AnalysisResult;
}
