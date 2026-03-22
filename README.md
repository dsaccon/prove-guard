# Prove Guard

Formal verification for Python, powered by AI. Paste a GitHub repo URL and get mathematical proofs about your code's safety.

Built at the [Zero to Agent: Vercel x DeepMind Hackathon SF](https://cerebralvalley.ai/e/zero-to-agent-sf/details) (March 21-22, 2026).

**Live demo:** [prove-guard.vercel.app](https://prove-guard.vercel.app)

**Video demo:** [Watch on YouTube](https://youtu.be/axmYk5XNOxs)

## What it does

Prove Guard analyzes Python functions for three classes of runtime safety bugs using formal verification — not heuristics, not AI guessing, but machine-checked mathematical proofs via the [Lean 4](https://lean-lang.org/) theorem prover.

### Safety properties checked

| Property | Detects | Example |
|---|---|---|
| **Division by Zero** | `/`, `//`, `%` operators | `sum(items) / len(items)` crashes on empty list |
| **Index Out of Bounds** | `list[i]`, `dict[key]` access | `items[0]` crashes on empty list |
| **None Dereference** | `None` defaults, `.get()`, `.find()` | `x.strip()` where `x=None` |

### Verdicts

- **Proven Safe** — Lean 4 verified the proof. The property holds for all inputs.
- **Potentially Unsafe** — Lean rejected the proof. Possible bug found.
- **Inconclusive** — Translation too complex or verification timed out.

## How it works

```
GitHub repo URL
    → Clone repo (shallow)
    → Extract Python functions (AST)
    → Classify safety properties (AST heuristics)
    → Translate to Lean 4 theorems (Gemini 3.1 Pro)
    → Verify proofs (Lean 4 compiler)
    → Display results
```

1. **Extract** — Parses Python files with `ast`, extracts functions under 50 lines
2. **Classify** — Uses AST heuristics (not AI) to detect which safety properties are relevant
3. **Translate** — Gemini 3.1 Pro generates Lean 4 formalizations with theorem statements and proof attempts
4. **Verify** — The Lean 4 compiler checks each proof. A successful compilation means the property is mathematically proven.

## Architecture

```
┌─────────────────┐         ┌──────────────────────────────────┐
│  Next.js UI      │────────▶│  Backend (FastAPI on Cloud Run)  │
│  (Vercel)        │◀────────│                                  │
│                  │         │  ┌─ Clone repo (git)             │
│  - Landing page  │         │  ├─ Extract functions (ast)      │
│  - Progress UI   │         │  ├─ Classify (AST heuristics)    │
│  - Results view  │         │  ├─ Translate (Gemini API)       │
└─────────────────┘         │  ├─ Verify (Lean 4 compiler)     │
                            │  └─ Return results                │
                            └──────────────────────────────────┘
```

## Tech stack

- **Frontend:** Next.js + Tailwind CSS on Vercel
- **Backend:** FastAPI + Python on GCP Cloud Run
- **AI:** Google Gemini 3.1 Pro
- **Verification:** Lean 4 theorem prover (via elan)
- **Parsing:** Python `ast` module

## Local development

### Backend

```bash
cd backend
docker build -t prove-guard-backend .
docker run --rm -p 8080:8080 -e GEMINI_API_KEY=your_key prove-guard-backend
```

### Frontend

```bash
cd frontend
npm install
BACKEND_URL=http://localhost:8080 npm run dev
```

## Why Lean

The three properties we check today (division by zero, index bounds, None dereference) can be caught by existing static analysis tools. We chose them because they're simple enough to demonstrate the architecture in a hackathon.

The real value of Lean is proving things static analysis **cannot**:

- **Algorithmic correctness** — "this sort function actually sorts," "this binary search returns the correct index"
- **Protocol invariants** — "this payment flow never charges a user twice," "this state machine always reaches a valid end state"
- **Cryptographic guarantees** — "this signature verification accepts iff the signature is valid"
- **Concurrency safety** — "these concurrent operations never produce inconsistent state"
- **Numerical properties** — "this financial calculation never loses precision beyond N decimal places"

Static analysis follows rules. Formal verification proves theorems. The architecture we built — AI translates code to Lean, Lean compiler verifies the proof — scales to properties that are fundamentally impossible for pattern-matching tools. What we showed today is the proof of concept; the properties above are where it gets interesting.

## Limits

- Max 20 Python files scanned per repo
- Max 10 functions analyzed per request
- Functions over 50 lines are skipped
- Only public repositories supported
- 30-second timeout per Lean proof attempt
