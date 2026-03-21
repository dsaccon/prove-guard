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
        lines = [l for l in lines if not l.strip().startswith("```")]
        lean_code = "\n".join(lines)

    return lean_code
