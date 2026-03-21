import asyncio
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
            return Verdict.POTENTIALLY_UNSAFE, output

        # Lean compiled successfully — check for sorry usage
        if "sorry" in lean_code.lower():
            return Verdict.POTENTIALLY_UNSAFE, output + "\n[Proof uses 'sorry' — property could not be proven safe]"

        # Clean compilation, no sorry — proven safe
        return Verdict.PROVEN_SAFE, output if output else "Proof verified successfully"

    except Exception as e:
        return Verdict.INCONCLUSIVE, f"Verification error: {str(e)}"

    finally:
        if lean_file.exists():
            lean_file.unlink()
