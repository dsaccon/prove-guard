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
