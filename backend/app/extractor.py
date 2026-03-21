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
