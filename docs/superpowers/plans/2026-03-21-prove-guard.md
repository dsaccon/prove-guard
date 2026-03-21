# Prove Guard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web app that formally verifies Python safety properties using Gemini + Lean 4.

**Architecture:** FastAPI backend on GCP Cloud Run handles the full pipeline (clone, extract, translate, verify). Next.js frontend on Vercel is a thin UI + proxy. Gemini 3.1 Pro translates Python to Lean 4 theorems. Lean compiler verifies proofs.

**Tech Stack:** FastAPI, Python 3.12, Lean 4 (via elan), Gemini 3.1 Pro, Next.js 14, Tailwind CSS, Docker, GCP Cloud Run, Vercel

**Spec:** `docs/superpowers/specs/2026-03-21-prove-guard-design.md`

---

## File Structure

### Backend (`backend/`)

```
backend/
  Dockerfile
  requirements.txt
  app/
    __init__.py
    main.py              # FastAPI app, /analyze endpoint with streaming
    extractor.py         # Clone repo, AST-extract functions, classify properties
    translator.py        # Gemini prompt templates + API calls
    verifier.py          # Write Lean code to disk, run lean, parse output
    models.py            # Pydantic models for request/response/progress events
  lean_project/
    lakefile.lean        # Pre-configured Lake project (no deps)
    lean-toolchain       # Pin Lean version
    ProveGuard.lean      # Placeholder so Lake builds
```

### Frontend (`frontend/`)

```
frontend/
  package.json
  next.config.js
  tailwind.config.ts
  tsconfig.json
  app/
    layout.tsx           # Root layout
    page.tsx             # Landing page + results (single-page app)
    api/
      analyze/
        route.ts         # Proxy to Cloud Run backend
  components/
    AnalyzeForm.tsx      # URL input + submit button
    ProgressStream.tsx   # Streaming progress display
    ResultsDashboard.tsx # Summary stats + function cards
    FunctionCard.tsx     # Per-function result with expandable Lean code
  lib/
    types.ts             # TypeScript types matching API schema
```

---

## Task 1: Backend Project Scaffolding + Dockerfile with Lean 4

> **This is the highest-risk task.** Getting Lean 4 working in a Docker container is the foundation everything else depends on. Do this first.

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/models.py`
- Create: `backend/lean_project/lakefile.lean`
- Create: `backend/lean_project/lean-toolchain`
- Create: `backend/lean_project/ProveGuard.lean`

- [ ] **Step 1: Create `backend/requirements.txt`**

```
fastapi==0.115.0
uvicorn==0.30.0
google-genai==1.0.0
pydantic==2.9.0
```

- [ ] **Step 2: Create `backend/app/__init__.py`**

Empty file.

- [ ] **Step 3: Create `backend/app/models.py`**

```python
from pydantic import BaseModel
from enum import Enum
from typing import Optional


class PropertyType(str, Enum):
    DIVISION_BY_ZERO = "division_by_zero"
    INDEX_OUT_OF_BOUNDS = "index_out_of_bounds"
    NONE_DEREFERENCE = "none_dereference"


class Verdict(str, Enum):
    PROVEN_SAFE = "proven_safe"
    POTENTIALLY_UNSAFE = "potentially_unsafe"
    INCONCLUSIVE = "inconclusive"


class PropertyResult(BaseModel):
    type: PropertyType
    verdict: Verdict
    lean_code: str
    compiler_output: str


class FunctionResult(BaseModel):
    name: str
    file_path: str
    source_code: str
    properties: list[PropertyResult]


class Summary(BaseModel):
    total_functions: int
    proven_safe: int
    potentially_unsafe: int
    inconclusive: int
    skipped: int


class AnalysisResult(BaseModel):
    repo_url: str
    summary: Summary
    functions: list[FunctionResult]


class AnalyzeRequest(BaseModel):
    repo_url: str


class ProgressEvent(BaseModel):
    step: str
    message: str
    count: Optional[int] = None
    current: Optional[int] = None
    total: Optional[int] = None
    result: Optional[AnalysisResult] = None
```

- [ ] **Step 4: Create `backend/app/main.py` (minimal)**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from app.models import AnalyzeRequest
import json

app = FastAPI(title="Prove Guard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    async def stream():
        yield json.dumps({"step": "cloning", "message": "Cloning repository..."}) + "\n"
        yield json.dumps({"step": "done", "message": "Pipeline not yet implemented"}) + "\n"

    return StreamingResponse(stream(), media_type="application/x-ndjson")
```

- [ ] **Step 5: Create Lean 4 Lake project files**

`backend/lean_project/lean-toolchain`:
```
leanprover/lean4:v4.15.0
```

`backend/lean_project/lakefile.lean`:
```lean
import Lake
open Lake DSL

package ProveGuard where
  leanOptions := #[
    ⟨`autoImplicit, false⟩
  ]

@[default_target]
lean_lib ProveGuard where
  srcDir := "."
```

`backend/lean_project/ProveGuard.lean`:
```lean
-- Placeholder for Prove Guard verifications
def hello := "Prove Guard"
```

- [ ] **Step 6: Create `backend/Dockerfile`**

```dockerfile
FROM python:3.12-slim

# Install git and curl
RUN apt-get update && apt-get install -y git curl && rm -rf /var/lib/apt/lists/*

# Install elan (Lean version manager)
RUN curl https://elan-init.github.io/elan/elan-init.sh -sSf | bash -s -- -y --default-toolchain none
ENV PATH="/root/.elan/bin:${PATH}"

# Copy Lean project and build it (downloads toolchain + builds)
COPY lean_project/ /app/lean_project/
WORKDIR /app/lean_project
RUN lake build

# Install Python dependencies
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy application code
COPY app/ /app/app/

WORKDIR /app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

- [ ] **Step 7: Build Docker image locally and verify Lean works**

```bash
cd backend
docker build -t prove-guard-backend .
docker run --rm prove-guard-backend lean --version
```

Expected: Lean version output (e.g., `leanprover/lean4:v4.15.0`)

- [ ] **Step 8: Test the FastAPI health endpoint**

```bash
docker run --rm -p 8080:8080 prove-guard-backend &
curl http://localhost:8080/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 9: Commit**

```bash
git add backend/
git commit -m "feat: scaffold backend with FastAPI + Lean 4 Docker setup"
```

---

## Task 2: Lean Verifier Module

> Write the module that takes Lean source code, writes it into the Lake project, runs `lean`, and parses the output to determine the verdict.

**Files:**
- Create: `backend/app/verifier.py`

- [ ] **Step 1: Create `backend/app/verifier.py`**

```python
import asyncio
import tempfile
import shutil
import os
from pathlib import Path
from app.models import Verdict

LEAN_PROJECT_DIR = Path("/app/lean_project")
TIMEOUT_SECONDS = 30


async def verify_lean_code(lean_code: str) -> tuple[Verdict, str]:
    """
    Write Lean code to the project, run lean, return (verdict, compiler_output).
    """
    # Create a unique file in the lean project
    lean_file = LEAN_PROJECT_DIR / f"Verify_{os.getpid()}_{id(lean_code)}.lean"

    try:
        lean_file.write_text(lean_code)

        proc = await asyncio.create_subprocess_exec(
            "lean", str(lean_file),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(LEAN_PROJECT_DIR),
        )

        try:
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=TIMEOUT_SECONDS
            )
        except asyncio.TimeoutError:
            proc.kill()
            await proc.communicate()
            return Verdict.INCONCLUSIVE, "Verification timed out after 30 seconds"

        output = (stdout.decode() + "\n" + stderr.decode()).strip()

        if proc.returncode != 0:
            # Lean rejected the proof — could be a real bug or bad translation
            return Verdict.POTENTIALLY_UNSAFE, output

        # Lean compiled successfully — check for sorry usage
        if "sorry" in lean_code.lower():
            # The proof used sorry, meaning it couldn't be proven
            return Verdict.POTENTIALLY_UNSAFE, output + "\n[Proof uses 'sorry' — property could not be proven safe]"

        # Clean compilation, no sorry — proven safe
        return Verdict.PROVEN_SAFE, output if output else "Proof verified successfully"

    except Exception as e:
        return Verdict.INCONCLUSIVE, f"Verification error: {str(e)}"

    finally:
        if lean_file.exists():
            lean_file.unlink()
```

- [ ] **Step 2: Test verifier manually in Docker**

```bash
docker run --rm prove-guard-backend python -c "
import asyncio
from app.verifier import verify_lean_code

code = '''
theorem simple : 1 + 1 = 2 := by decide
'''
result = asyncio.run(verify_lean_code(code))
print(result)
"
```

Expected: `(Verdict.PROVEN_SAFE, "Proof verified successfully")` or similar success output.

- [ ] **Step 3: Commit**

```bash
git add backend/app/verifier.py
git commit -m "feat: add Lean verifier module"
```

---

## Task 3: Python Extractor & Classifier

> Extract functions from Python files using AST, classify which safety properties are relevant.

**Files:**
- Create: `backend/app/extractor.py`

- [ ] **Step 1: Create `backend/app/extractor.py`**

```python
import ast
import asyncio
import os
import tempfile
import shutil
from dataclasses import dataclass, field
from pathlib import Path
from app.models import PropertyType

MAX_FILES = 20
MAX_FUNCTIONS = 10
MAX_FUNCTION_LINES = 50


@dataclass
class ExtractedFunction:
    name: str
    file_path: str
    source_code: str
    properties: list[PropertyType] = field(default_factory=list)


async def clone_repo(repo_url: str) -> Path:
    """Shallow clone a public GitHub repo. Returns path to cloned directory."""
    tmp_dir = Path(tempfile.mkdtemp(prefix="proveguard_"))
    clone_dir = tmp_dir / "repo"

    proc = await asyncio.create_subprocess_exec(
        "git", "clone", "--depth", "1", repo_url, str(clone_dir),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=60)

    if proc.returncode != 0:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        error_msg = stderr.decode().strip()
        raise RuntimeError(f"Failed to clone repository: {error_msg}")

    return clone_dir


def cleanup_repo(repo_dir: Path):
    """Remove cloned repo directory."""
    parent = repo_dir.parent
    shutil.rmtree(parent, ignore_errors=True)


def _classify_function(node: ast.FunctionDef) -> list[PropertyType]:
    """Use AST heuristics to detect which safety properties are relevant."""
    properties = []

    for child in ast.walk(node):
        # Division by zero: look for /, //, % operators
        if isinstance(child, ast.BinOp) and isinstance(
            child.op, (ast.Div, ast.FloorDiv, ast.Mod)
        ):
            if PropertyType.DIVISION_BY_ZERO not in properties:
                properties.append(PropertyType.DIVISION_BY_ZERO)

        # Index out of bounds: look for subscript access
        if isinstance(child, ast.Subscript):
            if PropertyType.INDEX_OUT_OF_BOUNDS not in properties:
                properties.append(PropertyType.INDEX_OUT_OF_BOUNDS)

    # None dereference: check for None defaults or .get()/.find() calls
    for arg in node.args.args:
        # Check defaults
        pass  # handled below

    for default in node.args.defaults:
        if isinstance(default, ast.Constant) and default.value is None:
            if PropertyType.NONE_DEREFERENCE not in properties:
                properties.append(PropertyType.NONE_DEREFERENCE)
                break

    for child in ast.walk(node):
        if isinstance(child, ast.Call) and isinstance(child.func, ast.Attribute):
            if child.func.attr in ("get", "find", "rfind"):
                if PropertyType.NONE_DEREFERENCE not in properties:
                    properties.append(PropertyType.NONE_DEREFERENCE)

    return properties


def extract_functions(repo_dir: Path) -> list[ExtractedFunction]:
    """Extract and classify Python functions from a repo."""
    functions: list[ExtractedFunction] = []

    py_files = sorted(repo_dir.rglob("*.py"))[:MAX_FILES]

    for py_file in py_files:
        try:
            source = py_file.read_text(encoding="utf-8", errors="ignore")
            tree = ast.parse(source)
        except (SyntaxError, UnicodeDecodeError):
            continue

        rel_path = str(py_file.relative_to(repo_dir))

        for node in ast.walk(tree):
            if not isinstance(node, ast.FunctionDef):
                continue

            # Skip too-long functions
            if hasattr(node, "end_lineno") and node.end_lineno and node.lineno:
                if node.end_lineno - node.lineno > MAX_FUNCTION_LINES:
                    continue

            # Get source code for this function
            try:
                func_source = ast.get_source_segment(source, node)
                if func_source is None:
                    continue
            except Exception:
                continue

            properties = _classify_function(node)

            functions.append(ExtractedFunction(
                name=node.name,
                file_path=rel_path,
                source_code=func_source,
                properties=properties,
            ))

            if len(functions) >= MAX_FUNCTIONS:
                return functions

    return functions
```

- [ ] **Step 2: Quick smoke test**

```bash
docker run --rm prove-guard-backend python -c "
import ast
from app.extractor import _classify_function, ExtractedFunction
from app.models import PropertyType

code = 'def avg(items): return sum(items) / len(items)'
tree = ast.parse(code)
func = [n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)][0]
props = _classify_function(func)
print(props)
"
```

Expected: `[PropertyType.DIVISION_BY_ZERO]`

- [ ] **Step 3: Commit**

```bash
git add backend/app/extractor.py
git commit -m "feat: add Python function extractor with AST-based classification"
```

---

## Task 4: Gemini Translator Module

> Call Gemini 3.1 Pro with templated prompts to translate Python functions into Lean 4 theorems.

**Files:**
- Create: `backend/app/translator.py`

- [ ] **Step 1: Create `backend/app/translator.py`**

```python
import os
from google import genai
from app.models import PropertyType

GEMINI_MODEL = "gemini-3.1-pro"

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", ""))

PROMPT_TEMPLATES = {
    PropertyType.DIVISION_BY_ZERO: """You are a formal verification expert. Given a Python function, generate Lean 4 code that models the function and attempts to prove it is safe from division by zero.

Python function:
```python
{function_source}
```

Generate a single Lean 4 file that:
1. Defines a function that models the core arithmetic logic
2. States a theorem that no division by zero can occur (the divisor is never zero for all valid inputs)
3. Proves the theorem if possible

Rules:
- Use ONLY Lean 4 built-in tactics (no imports except Init)
- Keep it simple — model the core logic, not full Python semantics
- If the function IS safe from division by zero, provide a complete proof
- If the function is NOT safe (division by zero is possible for some input), state the theorem and use `sorry` as the proof
- Output ONLY valid Lean 4 code, no markdown fences, no explanation""",

    PropertyType.INDEX_OUT_OF_BOUNDS: """You are a formal verification expert. Given a Python function, generate Lean 4 code that models the function and attempts to prove it is safe from index out of bounds errors.

Python function:
```python
{function_source}
```

Generate a single Lean 4 file that:
1. Defines a function that models the list/array access pattern
2. States a theorem that all index accesses are within bounds for all valid inputs
3. Proves the theorem if possible

Rules:
- Use ONLY Lean 4 built-in tactics (no imports except Init)
- Model lists as Lean Lists, indices as Nat
- If the function IS safe, provide a complete proof
- If the function is NOT safe (out of bounds is possible for some input), state the theorem and use `sorry` as the proof
- Output ONLY valid Lean 4 code, no markdown fences, no explanation""",

    PropertyType.NONE_DEREFERENCE: """You are a formal verification expert. Given a Python function, generate Lean 4 code that models the function and attempts to prove it never dereferences a None/null value.

Python function:
```python
{function_source}
```

Generate a single Lean 4 file that:
1. Models nullable values using Option types
2. States a theorem that no None dereference occurs for all valid inputs
3. Proves the theorem if possible

Rules:
- Use ONLY Lean 4 built-in tactics (no imports except Init)
- Model Python None as Option.none
- If the function IS safe from None dereference, provide a complete proof
- If the function is NOT safe (None dereference is possible), state the theorem and use `sorry` as the proof
- Output ONLY valid Lean 4 code, no markdown fences, no explanation""",
}


async def translate_to_lean(
    function_source: str, property_type: PropertyType
) -> str:
    """Translate a Python function into Lean 4 code for the given property."""
    prompt = PROMPT_TEMPLATES[property_type].format(function_source=function_source)

    response = await client.aio.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=genai.types.GenerateContentConfig(
            temperature=0,
        ),
    )

    lean_code = response.text.strip()

    # Strip markdown fences if Gemini adds them despite instructions
    if lean_code.startswith("```"):
        lines = lean_code.split("\n")
        # Remove first and last lines (fences)
        lines = [l for l in lines if not l.strip().startswith("```")]
        lean_code = "\n".join(lines)

    return lean_code
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/translator.py
git commit -m "feat: add Gemini translator with per-property prompt templates"
```

---

## Task 5: Wire Up the Full Pipeline

> Connect extractor → translator → verifier in the `/analyze` endpoint with streaming progress.

**Files:**
- Modify: `backend/app/main.py`

- [ ] **Step 1: Update `backend/app/main.py` with full pipeline**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from app.models import (
    AnalyzeRequest, AnalysisResult, FunctionResult,
    PropertyResult, Summary, ProgressEvent,
)
from app.extractor import clone_repo, extract_functions, cleanup_repo
from app.translator import translate_to_lean
from app.verifier import verify_lean_code
import json

app = FastAPI(title="Prove Guard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    async def stream():
        repo_dir = None
        try:
            # Step 1: Clone
            yield json.dumps({"step": "cloning", "message": "Cloning repository..."}) + "\n"
            repo_dir = await clone_repo(request.repo_url)

            # Step 2: Extract
            yield json.dumps({"step": "extracting", "message": "Extracting Python functions..."}) + "\n"
            extracted = extract_functions(repo_dir)

            has_properties = [f for f in extracted if f.properties]
            skipped = len(extracted) - len(has_properties)

            yield json.dumps({
                "step": "extracting",
                "message": f"Found {len(extracted)} functions, {len(has_properties)} with safety properties to check",
                "count": len(has_properties),
            }) + "\n"

            # Steps 3 & 4: Translate and verify each function
            function_results: list[dict] = []
            total = len(has_properties)

            for i, func in enumerate(has_properties):
                prop_results: list[dict] = []

                for prop_type in func.properties:
                    # Translate
                    yield json.dumps({
                        "step": "translating",
                        "message": f"Generating Lean proof for {func.name} ({prop_type.value})...",
                        "current": i + 1,
                        "total": total,
                    }) + "\n"

                    lean_code = await translate_to_lean(func.source_code, prop_type)

                    # Verify
                    yield json.dumps({
                        "step": "verifying",
                        "message": f"Verifying {func.name} ({prop_type.value}) with Lean...",
                        "current": i + 1,
                        "total": total,
                    }) + "\n"

                    verdict, compiler_output = await verify_lean_code(lean_code)

                    prop_results.append({
                        "type": prop_type.value,
                        "verdict": verdict.value,
                        "lean_code": lean_code,
                        "compiler_output": compiler_output,
                    })

                function_results.append({
                    "name": func.name,
                    "file_path": func.file_path,
                    "source_code": func.source_code,
                    "properties": prop_results,
                })

            # Build summary
            all_props = [p for f in function_results for p in f["properties"]]
            summary = {
                "total_functions": len(extracted),
                "proven_safe": sum(1 for p in all_props if p["verdict"] == "proven_safe"),
                "potentially_unsafe": sum(1 for p in all_props if p["verdict"] == "potentially_unsafe"),
                "inconclusive": sum(1 for p in all_props if p["verdict"] == "inconclusive"),
                "skipped": skipped,
            }

            result = {
                "repo_url": request.repo_url,
                "summary": summary,
                "functions": function_results,
            }

            yield json.dumps({"step": "done", "result": result}) + "\n"

        except Exception as e:
            yield json.dumps({"step": "error", "message": str(e)}) + "\n"

        finally:
            if repo_dir:
                cleanup_repo(repo_dir)

    return StreamingResponse(stream(), media_type="application/x-ndjson")
```

- [ ] **Step 2: Rebuild Docker image and test end-to-end locally**

```bash
cd backend
docker build -t prove-guard-backend .
docker run --rm -p 8080:8080 -e GEMINI_API_KEY=$GEMINI_API_KEY prove-guard-backend
```

In another terminal:
```bash
curl -X POST http://localhost:8080/analyze \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "https://github.com/USERNAME/some-small-python-repo"}'
```

Expected: Streaming NDJSON output with progress events and final result.

- [ ] **Step 3: Commit**

```bash
git add backend/app/main.py
git commit -m "feat: wire up full analysis pipeline with streaming"
```

---

## Task 6: Deploy Backend to GCP Cloud Run

> Get the backend running on Cloud Run before touching the frontend.

**Files:**
- No new files (uses existing Dockerfile)

- [ ] **Step 1: Build and push Docker image to GCR**

```bash
cd backend
gcloud builds submit --tag gcr.io/PROJECT_ID/prove-guard-backend
```

Replace `PROJECT_ID` with your GCP project ID.

- [ ] **Step 2: Deploy to Cloud Run**

```bash
gcloud run deploy prove-guard-backend \
  --image gcr.io/PROJECT_ID/prove-guard-backend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 600 \
  --min-instances 1 \
  --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY
```

- [ ] **Step 3: Test deployed endpoint**

```bash
curl https://YOUR-CLOUD-RUN-URL/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 4: Test full pipeline on Cloud Run**

```bash
curl -X POST https://YOUR-CLOUD-RUN-URL/analyze \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "https://github.com/USERNAME/some-small-python-repo"}'
```

Expected: Streaming NDJSON with results.

- [ ] **Step 5: Commit (note the Cloud Run URL)**

Save the Cloud Run URL — you'll need it for the frontend proxy.

---

## Task 7: Frontend Scaffolding

> Set up Next.js project with Tailwind and the API proxy route.

**Files:**
- Create: `frontend/` (via create-next-app)
- Create: `frontend/lib/types.ts`
- Create: `frontend/app/api/analyze/route.ts`

- [ ] **Step 1: Scaffold Next.js project**

```bash
cd ~/Desktop/Dave/work/dev/misc/deepmind-zero-to-agent-hackathon
npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir --no-eslint --import-alias "@/*"
```

- [ ] **Step 2: Create `frontend/lib/types.ts`**

```typescript
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
  repoUrl: string;
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
```

- [ ] **Step 3: Create `frontend/app/api/analyze/route.ts`**

```typescript
import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const response = await fetch(`${BACKEND_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
    return new Response(
      JSON.stringify({ step: "error", message: "Backend request failed" }),
      { status: 500 }
    );
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
    },
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold Next.js frontend with API proxy"
```

---

## Task 8: Frontend UI Components

> Build the landing page, progress display, and results dashboard.

**Files:**
- Create: `frontend/components/AnalyzeForm.tsx`
- Create: `frontend/components/ProgressStream.tsx`
- Create: `frontend/components/ResultsDashboard.tsx`
- Create: `frontend/components/FunctionCard.tsx`
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/app/layout.tsx`

- [ ] **Step 1: Create `frontend/components/AnalyzeForm.tsx`**

```tsx
"use client";

import { useState } from "react";

interface Props {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export default function AnalyzeForm({ onSubmit, isLoading }: Props) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) onSubmit(url.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="flex gap-3">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/user/repo"
          className="flex-1 px-4 py-3 rounded-lg border border-gray-700 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Analyzing..." : "Analyze"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create `frontend/components/ProgressStream.tsx`**

```tsx
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
```

- [ ] **Step 3: Create `frontend/components/FunctionCard.tsx`**

```tsx
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
```

- [ ] **Step 4: Create `frontend/components/ResultsDashboard.tsx`**

```tsx
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
```

- [ ] **Step 5: Update `frontend/app/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import AnalyzeForm from "@/components/AnalyzeForm";
import ProgressStream from "@/components/ProgressStream";
import ResultsDashboard from "@/components/ResultsDashboard";
import { AnalysisResult, ProgressEvent } from "@/lib/types";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3">Prove Guard</h1>
        <p className="text-gray-400 text-lg max-w-xl">
          Formal verification for Python, powered by AI. Paste a GitHub repo and get mathematical proofs about your code's safety.
        </p>
      </div>

      <AnalyzeForm onSubmit={handleAnalyze} isLoading={isLoading} />

      <div className="mt-10 w-full flex justify-center">
        {isLoading && !result && <ProgressStream events={events} />}

        {error && (
          <div className="w-full max-w-2xl p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {result && <ResultsDashboard result={result} />}
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Update `frontend/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Prove Guard — Formal Verification for Python",
  description: "AI-powered formal verification using Lean 4",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950`}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Test locally**

```bash
cd frontend
BACKEND_URL=https://YOUR-CLOUD-RUN-URL npm run dev
```

Open http://localhost:3000, paste a small Python repo URL, verify the full flow works.

- [ ] **Step 8: Commit**

```bash
git add frontend/
git commit -m "feat: build frontend UI with progress streaming and results dashboard"
```

---

## Task 9: Deploy Frontend to Vercel

**Files:**
- No new files

- [ ] **Step 1: Deploy to Vercel**

```bash
cd frontend
npx vercel --prod
```

When prompted, set the environment variable:
- `BACKEND_URL` = your Cloud Run URL (e.g., `https://prove-guard-backend-xxxxx-uc.a.run.app`)

- [ ] **Step 2: Test the deployed app**

Open the Vercel URL, paste a GitHub repo URL, verify end-to-end flow.

- [ ] **Step 3: Commit any Vercel config changes**

```bash
git add .
git commit -m "chore: configure Vercel deployment"
```

---

## Task 10: Demo Safety Net

> Pre-cache results for a known repo so the demo always has something to show.

**Files:**
- Create: `frontend/lib/demo-data.ts`
- Modify: `frontend/app/page.tsx` (add demo mode)

- [ ] **Step 1: Run the pipeline against a known small Python repo and save the result**

```bash
curl -X POST https://YOUR-CLOUD-RUN-URL/analyze \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "https://github.com/USERNAME/DEMO-REPO"}' > demo-result.json
```

- [ ] **Step 2: Create `frontend/lib/demo-data.ts`**

Copy the final `result` object from the NDJSON output into this file:

```typescript
import { AnalysisResult } from "./types";

export const DEMO_RESULT: AnalysisResult = {
  // Paste the actual result JSON here after running the pipeline
  repoUrl: "https://github.com/USERNAME/DEMO-REPO",
  summary: { totalFunctions: 0, provenSafe: 0, potentiallyUnsafe: 0, inconclusive: 0, skipped: 0 },
  functions: [],
};
```

- [ ] **Step 3: Add demo button to `frontend/app/page.tsx`**

Add a "Try Demo" link below the form that loads the cached result without hitting the backend:

```tsx
<button
  onClick={() => {
    setResult(DEMO_RESULT);
    setIsLoading(false);
  }}
  className="text-sm text-gray-500 hover:text-gray-300 mt-3"
>
  Or try a demo with pre-analyzed results
</button>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/
git commit -m "feat: add demo safety net with pre-cached results"
```

---

## Task 11: Init Git Repo

> This should actually be done before Task 1 — initialize the git repo in the project directory.

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Initialize git repo**

```bash
cd ~/Desktop/Dave/work/dev/misc/deepmind-zero-to-agent-hackathon
git init
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
.next/
__pycache__/
*.pyc
.env
.vercel/
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: init repo with gitignore"
```

---

## Execution Order

Due to dependencies, execute in this order:

1. **Task 11** (git init) — do first
2. **Task 1** (backend scaffold + Docker + Lean) — highest risk, derisk immediately
3. **Task 2** (verifier) — depends on Task 1
4. **Task 3** (extractor) — depends on Task 1
5. **Task 4** (translator) — independent of 2/3
6. **Task 5** (wire pipeline) — depends on 2, 3, 4
7. **Task 6** (deploy backend) — depends on 5
8. **Task 7** (frontend scaffold) — can start after Task 1, independent of backend tasks
9. **Task 8** (frontend UI) — depends on 7
10. **Task 9** (deploy frontend) — depends on 6, 8
11. **Task 10** (demo safety net) — depends on 9

**Parallelizable:** Tasks 2, 3, 4 can be done in parallel. Task 7 can start while Tasks 2-6 are in progress.
