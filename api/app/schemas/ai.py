from pydantic import BaseModel
from typing import Literal


class WhyThisMatters(BaseModel):
    what_is_wrong: str
    why_it_matters: str
    how_to_fix: str
    code_example: str | None = None


class ReviewIssueOut(BaseModel):
    severity: Literal["critical", "high", "medium", "low"]
    mode_tags: list[Literal["generic", "bug_hunter", "security", "performance", "maintainability"]]
    line_start: int | None = None
    line_end: int | None = None
    comment: str
    why_this_matters: WhyThisMatters
    suggested_fix: str | None = None


class ReviewFileOut(BaseModel):
    file_path: str
    file_summary: str
    issues: list[ReviewIssueOut]


class SummaryOut(BaseModel):
    overall_verdict: Literal["pass", "pass_with_notes", "needs_changes"]
    risk_level: Literal["critical", "low", "medium", "high"]
    short_summary: str


class FinalSummaryOut(BaseModel):
    key_takeaways: list[str]
    recommended_next_steps: list[str]


class DiffLensReviewOutput(BaseModel):
    summary: SummaryOut
    files: list[ReviewFileOut]
    final_summary: FinalSummaryOut
