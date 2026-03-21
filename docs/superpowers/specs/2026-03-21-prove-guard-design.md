# Prove Guard — Design Spec

## Overview

Prove Guard is a web application where users paste a GitHub repository URL and receive a formal verification report on Python safety properties. It uses Gemini to translate Python functions into Lean 4 theorems, then runs the Lean compiler to actually verify the proofs.

Built for the Zero to Agent: Vercel x DeepMind Hackathon SF (March 21–22, 2026).

## Problem

Python is dynamically typed and has no built-in safety guarantees. Common runtime crashes — division by zero, index out of bounds, None dereference — are easy to introduce and hard to catch with traditional testing. Formal verification can mathematically prove the absence of these bugs, but it's inaccessible to most developers.

Prove Guard bridges this gap by using AI to automatically generate and verify formal proofs for Python code.

## Architecture

```
┌─────────────────┐         ┌──────────────────────────────────┐
│  Next.js UI      │────────▶│  Backend (FastAPI on Cloud Run)  │
│  (Vercel)        │◀────────│                                  │
│                  │         │  ┌─ Clone repo (git)             │
│  - Landing page  │         │  ├─ Extract functions (ast)      │
│  - Progress UI   │         │  ├─ Classify (AST heuristics)    │
│  - Results view  │         │  ├─ Translate (Gemini API)       │
└─────────────────┘         │  ├─ Verify (lean compiler)       │
                            │  └─ Return results                │
                            └──────────────────────────────────┘
```

### Components

**1. Next.js Frontend (Vercel)**
- Landing page with GitHub repo URL input
- Loading state with streaming progress updates
- Results dashboard with per-function verdict cards
- Thin client — all logic lives on the backend

**2. Backend Service (FastAPI on GCP Cloud Run)**
- Runs the entire pipeline: clone → extract → classify → translate → verify → respond
- Has Python runtime (for `ast` parsing), `git` (for cloning), and Lean 4 (for verification) all in one container
- Gemini API calls happen here
- Streaming response to keep connection alive during long pipelines
- Stateless, no persistence

**3. Gemini API (3.1 Pro)**
- Translates Python functions into Lean 4 formalizations
- Generates theorem statements and proof attempts
- Prompted with heavily templated prompts per property type
- Temperature: 0 for deterministic output

**4. Next.js API Route (Vercel) — Thin Proxy**
- Single route that proxies requests to the Cloud Run backend
- Handles CORS, streams the response back to the client
- No business logic

## Pipeline

### Step 1: Fetch & Extract
- Shallow clone the repo on Cloud Run (just HEAD, `git clone --depth 1`)
- Parse Python files using Python's `ast` module to extract individual functions
- Filter to analyzable functions: under ~50 lines, relatively self-contained, no complex class dependencies
- **Limits**: Max 20 Python files scanned, max 10 functions sent for analysis

### Step 2: Classify & Select
- Use AST heuristics (not Gemini) to detect relevant properties per function:
  - Division: contains `/`, `//`, or `%` operators in AST
  - Indexing: contains `Subscript` nodes
  - None: has parameters with `None` defaults, or calls `.get()`, `.find()`, etc.
- Functions with no relevant properties are skipped with a "no safety properties to verify" label
- This avoids burning a Gemini call on classification

### Step 3: Translate to Lean
- For each selected function + property pair, Gemini generates:
  - A Lean 4 formalization of the function's logic (simplified mathematical model)
  - A theorem statement (e.g., `theorem no_div_by_zero : ∀ x y, y ≠ 0 → safe_div x y ≠ none`)
  - A proof attempt
- Prompts are heavily templated per property type
- Generated Lean code must use only Lean 4 built-in tactics (no Mathlib dependency) to keep the Docker image small and compilation fast

### Step 4: Verify
- Write generated Lean code into a pre-configured Lake project in the container
- Run `lean` to check the proof
- 30-second timeout per proof attempt
- Three possible outcomes per function/property:
  - **Proven safe** — Lean compiled the proof successfully
  - **Potentially unsafe** — Lean rejected the proof (possible real bug or imperfect translation)
  - **Inconclusive** — Lean errored out (syntax issues, timeout, translation too complex)

### Step 5: Report
- Return structured results to frontend
- Each function gets a card showing source code, properties checked, verdict, and expandable Lean code + compiler output

## API Response Schema

```typescript
interface AnalysisResult {
  repoUrl: string;
  summary: {
    totalFunctions: number;
    provenSafe: number;
    potentiallyUnsafe: number;
    inconclusive: number;
    skipped: number;
  };
  functions: {
    name: string;
    filePath: string;
    sourceCode: string;
    properties: {
      type: "division_by_zero" | "index_out_of_bounds" | "none_dereference";
      verdict: "proven_safe" | "potentially_unsafe" | "inconclusive";
      leanCode: string;
      compilerOutput: string;
    }[];
  }[];
}
```

Progress events are streamed as newline-delimited JSON:
```json
{"step": "cloning", "message": "Cloning repository..."}
{"step": "extracting", "message": "Extracting functions...", "count": 15}
{"step": "translating", "message": "Generating Lean proof for func_name...", "current": 3, "total": 8}
{"step": "verifying", "message": "Verifying proof for func_name...", "current": 3, "total": 8}
{"step": "done", "result": { ... AnalysisResult ... }}
```

## Safety Properties

### 1. Division by Zero
- **Detect**: AST contains `BinOp` with `Div`, `FloorDiv`, or `Mod` operator
- **Lean pattern**: Prove the divisor expression is never zero given function preconditions
- **Example**: `def avg(items): return sum(items) / len(items)` → Can we prove `len(items) ≠ 0`? No — empty list is valid input. **Potentially unsafe.**

### 2. Index Out of Bounds
- **Detect**: AST contains `Subscript` nodes on list-like variables
- **Lean pattern**: Prove index is within `0 ≤ i < len(collection)`
- **Example**: `def first(items): return items[0]` → Can we prove `len(items) > 0`? No precondition guarantees it. **Potentially unsafe.**

### 3. None/Null Dereference
- **Detect**: Function has parameters with `None` defaults, or calls methods that can return `None` (`.get()`, `.find()`, etc.)
- **Lean pattern**: Prove the value is not `None` at point of use
- **Example**: `def process(x=None): return x.strip()` → Can we prove `x ≠ none`? No. **Potentially unsafe.**

## Gemini Prompting Strategy

**Model**: Gemini 3.1 Pro

**Example prompt template (division by zero)**:

```
You are a formal verification expert. Given a Python function, generate a Lean 4 formalization that proves the function is safe from division by zero errors.

Python function:
```python
{function_source}
```

Generate:
1. A Lean 4 definition that models this function's logic
2. A theorem stating that no division by zero can occur
3. A proof of the theorem

Rules:
- Use only Lean 4 built-in tactics (no Mathlib imports)
- Keep the formalization simple — model the core arithmetic logic, not Python semantics
- If the function IS safe, provide a valid proof
- If the function is NOT safe (division by zero is possible), state the theorem and use `sorry` as the proof
- Output ONLY the Lean 4 code, no explanation
```

## Frontend UX

### Landing Page
- Headline: "Prove Guard — Formal verification for Python, powered by AI"
- Single input field for GitHub repo URL
- "Analyze" button
- Brief explanation of what the tool does

### Loading State
- Step-by-step progress streamed from backend: "Cloning repo..." → "Extracting functions..." → "Generating proofs..." → "Verifying with Lean..."
- Expected duration: 30–60 seconds for a small repo

### Results Dashboard
- Summary stats: X functions analyzed, Y proven safe, Z potentially unsafe, W inconclusive
- Function cards with:
  - Function name + file path
  - Source code snippet
  - Properties checked
  - Verdict badge (green/red/yellow)
  - Expandable Lean code and compiler output

### Error Handling
- Private repos: display clear error "Only public repositories are supported"
- Clone failures: display error with the git error message
- Empty repos / no Python files: display "No Python functions found to analyze"

## Tech Stack

- **Frontend**: Next.js + Tailwind CSS, deployed on Vercel
- **Backend**: FastAPI + Python, Docker container with git + Lean 4 (via elan), deployed on GCP Cloud Run
- **AI**: Google Gemini 3.1 Pro API
- **Python Parsing**: Python `ast` module (runs on Cloud Run)
- **Repo Cloning**: `git` CLI via subprocess on Cloud Run (shallow clone)

## Lean 4 Docker Setup

The Docker image must:
1. Install `elan` (Lean version manager)
2. Install Lean 4 stable toolchain
3. Pre-configure a Lake project with no external dependencies (built-in tactics only)
4. Pre-build the Lake project so first verification doesn't incur build overhead
5. Generated Lean files are written into this project for verification

This avoids Mathlib (which is ~5GB compiled) and keeps the container small and verification fast.

## Demo Safety Net

Pre-cache results for one known public repo (e.g., a small utility library with obvious safety issues). If the live pipeline breaks during the demo (network, Gemini rate limits, Lean issues), display the cached result to still have something to show.

## Key Design Decisions

1. **All pipeline logic on Cloud Run** — Vercel serverless can't run git, Python ast, or Lean. Cloud Run has a full Docker environment.
2. **Next.js is a thin UI + proxy** — Minimizes integration complexity and avoids Vercel timeout issues.
3. **AST heuristics for classification, not Gemini** — Faster, cheaper, and deterministic.
4. **Built-in Lean tactics only, no Mathlib** — Keeps Docker image small and compilation fast.
5. **Streaming responses** — Pipeline takes 30-60 seconds; streaming keeps the UX responsive.
6. **Hard caps on files/functions** — Max 20 files, 10 functions. Keeps demo fast and costs bounded.
7. **"Inconclusive" is a valid result** — Honesty about limitations builds trust.
8. **Lean runner is the highest-risk component** — Build and deploy it first to derisk.
9. **Pre-cached demo results** — Safety net for live demo failures.

## Project Directory

`~/Desktop/Dave/work/dev/misc/deepmind-zero-to-agent-hackathon`
