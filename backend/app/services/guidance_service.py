from __future__ import annotations

from pathlib import Path

from backend.app.schemas.cases import CaseIntake


GUIDANCE_DIR = Path(__file__).resolve().parents[1] / "data" / "maternal_guidance"


def _keyword_score(text: str, keywords: set[str]) -> int:
    lowered = text.lower()
    return sum(1 for keyword in keywords if keyword in lowered)


def retrieve_guidance_context(case: CaseIntake, max_docs: int = 2) -> str:
    keywords = {case.pregnancy_status.lower(), case.transport_mode.lower()}
    keywords.update(sign.lower() for sign in case.danger_signs)

    candidates: list[tuple[int, str, str]] = []

    for path in GUIDANCE_DIR.glob("*.md"):
        content = path.read_text(encoding="utf-8")
        score = _keyword_score(content, keywords)
        candidates.append((score, path.name, content))

    candidates.sort(key=lambda item: item[0], reverse=True)
    top_matches = [item for item in candidates[:max_docs] if item[0] > 0]

    if not top_matches:
        top_matches = candidates[:1]

    context_blocks: list[str] = []
    for _, filename, content in top_matches:
        trimmed = content.strip()
        context_blocks.append(f"Source: {filename}\n{trimmed}")

    return "\n\n---\n\n".join(context_blocks)
