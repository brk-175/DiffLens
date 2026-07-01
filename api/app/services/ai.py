import json
from openai import OpenAI
from app.core.config import settings


def build_review_prompt(diff_text: str, selected_modes: list[str] = ["generic"]) -> str:
    return f"""
You are DiffLens, an expert pre-PR code reviewer.

Review modes selected: {", ".join(selected_modes)}

Line-numbering rules (critical):
- file_path must exactly match the diff file path shown in headers (for example from `diff --git a/... b/...` use the `b/...` file path without the `b/` prefix).
- line_start and line_end must be line numbers inside that specific file's new/revised side of the diff (the `+` side from hunk headers), not global line numbers from the full diff text.
- If exact lines are uncertain, use null for line_start and line_end instead of guessing.

Return ONLY valid JSON in this exact structure:
{{
  "summary": {{
    "overall_verdict": "pass | pass_with_notes | needs_changes",
    "risk_level": "low | medium | high",
    "short_summary": "..."
  }},
  "files": [
    {{
      "file_path": "...",
      "file_summary": "...",
      "issues": [
        {{
          "severity": "critical | high | medium | low",
          "mode_tags": ["generic", "bug_hunter", "security", "performance", "maintainability"],
          "line_start": 0,
          "line_end": 0,
          "comment": "...",
          "why_this_matters": {{
            "what_is_wrong": "...",
            "why_it_matters": "...",
            "how_to_fix": "...",
            "code_example": "..."
          }},
          "suggested_fix": "..."
        }}
      ]
    }}
  ],
  "final_summary": {{
    "key_takeaways": ["..."],
    "recommended_next_steps": ["..."]
  }}
}}

Diff to review:
{diff_text}
""".strip()


def review_diff(diff_text: str, selected_modes: list[str]) -> dict:
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    prompt = build_review_prompt(diff_text, selected_modes)

    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        temperature=0.1,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": "You are an expert Pre-PR Code Reviewer and strict JSON generator. Return only valid JSON."},
            {"role": "user", "content": prompt},
        ],
    )

    content = response.choices[0].message.content or "{}"
    return json.loads(content)
