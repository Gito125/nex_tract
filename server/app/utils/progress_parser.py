from dataclasses import dataclass
import re


@dataclass(frozen=True)
class ProgressUpdate:
    progress: int | None = None
    speed: str | None = None
    eta: str | None = None
    status: str | None = None


PERCENT_PATTERN = re.compile(r"\[download\]\s+(\d+(?:\.\d+)?)%")
SPEED_PATTERN = re.compile(r"\bat\s+([^\s]+/s)")
ETA_PATTERN = re.compile(r"\bETA\s+([^\s]+)")


def parse_ytdlp_progress_line(line: str) -> ProgressUpdate | None:
    text = line.strip()
    if not text:
        return None

    if text.startswith("[Merger]"):
        return ProgressUpdate(progress=99, status="merging")

    if text.startswith("[ExtractAudio]") or text.startswith("[ffmpeg]"):
        return ProgressUpdate(progress=99, status="postprocessing")

    if not text.startswith("[download]"):
        return None

    if "has already been downloaded" in text or "100%" in text:
        return ProgressUpdate(progress=100, eta="00:00", status="completed")

    percent_match = PERCENT_PATTERN.search(text)
    if not percent_match:
        return None

    progress = round(float(percent_match.group(1)))
    progress = max(0, min(progress, 100))

    speed_match = SPEED_PATTERN.search(text)
    eta_match = ETA_PATTERN.search(text)

    return ProgressUpdate(
        progress=progress,
        speed=_clean_metric(speed_match.group(1) if speed_match else None),
        eta=_clean_metric(eta_match.group(1) if eta_match else None),
        status="downloading",
    )


def _clean_metric(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = value.strip()
    if cleaned in {"N/A", "Unknown", "--"}:
        return None
    return cleaned
