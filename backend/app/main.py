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
