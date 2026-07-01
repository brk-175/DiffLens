from __future__ import annotations

import re
from dataclasses import dataclass, field


HUNK_HEADER_RE = re.compile(r"^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@")


@dataclass
class ParsedDiffFile:
    file_path: str
    numbered_lines: list[tuple[int, str]] = field(default_factory=list)
    line_numbers: set[int] = field(default_factory=set)


def normalize_file_path(path: str) -> str:
    normalized = (path or "").strip().replace("\\", "/")
    if normalized.startswith("a/") or normalized.startswith("b/"):
        normalized = normalized[2:]
    return normalized


def _match_or_create_file(files: dict[str, ParsedDiffFile], path: str) -> ParsedDiffFile:
    normalized = normalize_file_path(path)
    existing = files.get(normalized)
    if existing:
        return existing
    created = ParsedDiffFile(file_path=normalized)
    files[normalized] = created
    return created


def parse_unified_diff(diff_text: str) -> tuple[dict[str, ParsedDiffFile], dict[int, tuple[str, int]]]:
    files: dict[str, ParsedDiffFile] = {}
    global_to_file_line: dict[int, tuple[str, int]] = {}

    current_file_path: str | None = None
    current_file: ParsedDiffFile | None = None
    in_hunk = False
    new_line = 0

    lines = diff_text.splitlines()
    for global_idx, line in enumerate(lines, start=1):
        if line.startswith("diff --git "):
            in_hunk = False
            parts = line.split()
            if len(parts) >= 4:
                current_file_path = normalize_file_path(parts[3])
                current_file = _match_or_create_file(files, current_file_path)
            else:
                current_file_path = None
                current_file = None
            continue

        if line.startswith("+++ "):
            raw_path = line[4:].strip()
            if raw_path != "/dev/null":
                current_file_path = normalize_file_path(raw_path)
                current_file = _match_or_create_file(files, current_file_path)
            continue

        hunk_match = HUNK_HEADER_RE.match(line)
        if hunk_match:
            in_hunk = True
            new_line = int(hunk_match.group(1))
            continue

        if not in_hunk or not current_file_path or current_file is None:
            continue

        if line.startswith("+") and not line.startswith("+++"):
            content = line[1:]
            current_file.numbered_lines.append((new_line, content))
            current_file.line_numbers.add(new_line)
            global_to_file_line[global_idx] = (current_file.file_path, new_line)
            new_line += 1
            continue

        if line.startswith(" "):
            content = line[1:]
            current_file.numbered_lines.append((new_line, content))
            current_file.line_numbers.add(new_line)
            global_to_file_line[global_idx] = (current_file.file_path, new_line)
            new_line += 1
            continue

        if line.startswith("-") and not line.startswith("---"):
            continue

        if line.startswith("\\ No newline at end of file"):
            continue

        in_hunk = False

    return files, global_to_file_line


def find_best_file_match(parsed_files: dict[str, ParsedDiffFile], requested_path: str) -> ParsedDiffFile | None:
    if not parsed_files:
        return None

    normalized = normalize_file_path(requested_path)
    if normalized in parsed_files:
        return parsed_files[normalized]

    suffix_matches = [
        candidate
        for candidate in parsed_files.values()
        if candidate.file_path.endswith(normalized) or normalized.endswith(candidate.file_path)
    ]
    if len(suffix_matches) == 1:
        return suffix_matches[0]
    if len(suffix_matches) > 1:
        return sorted(suffix_matches, key=lambda f: len(f.file_path))[0]

    return None


def normalize_issue_line_number(
    line: int | None,
    file_path: str,
    valid_file_lines: set[int],
    global_to_file_line: dict[int, tuple[str, int]],
) -> int | None:
    if line is None:
        return None

    if line in valid_file_lines:
        return line

    mapped = global_to_file_line.get(line)
    if mapped and mapped[0] == file_path:
        return mapped[1]

    return None


def render_numbered_file_code(parsed_file: ParsedDiffFile) -> str:
    return "\n".join(f"{line_no}\t{text}" for line_no, text in parsed_file.numbered_lines)
