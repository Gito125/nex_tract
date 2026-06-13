# Nextract Backend Hardening: Type Checking & Linting Report

**Date:** June 14, 2026
**Topic:** Resolving Type-Safety Violations, Linting Errors, and Pylance/Pyright Compatibility in Backend Platform Adapters and Services (Phase 10 Hardening)

## 1. Issue Summary
During the final hardening pass of Phase 10, strict type-checking (via `mypy --strict` and `Pylance/Pyright`) was run across all 70 server Python files. The following discrepancies and type-safety warnings were identified:
- **Pylance/Pyright Argument Type Mismatches:** Passing custom option dictionaries (`ydl_opts`) to untyped library functions (such as `yt_dlp.YoutubeDL`) triggered argument assignment errors (`reportArgumentType`) because of loose types in third-party stub definitions.
- **TypedDict Mutation Violations:** Appending the internal nextract property (`_nextract_media_type`) onto the payload dictionary returned by `yt_dlp` triggered typing errors (`reportGeneralTypeIssues`) since `_InfoDict` does not define this key in its type signature.
- **Strict Return-Type Violations (`no-any-return`):** Untyped method returns from external library calls resulted in `Any` leaks, failing strict return type signatures declared as `dict[str, Any]` or `MediaType`.
- **Implicit Module Exports:** Importing utility classes/exceptions (like `PlatformInfo` and `PlatformValidationError`) from intermediate files like `platform_detector.py` caused implicit import resolution warnings under strict rules.
- **Dead Comparison Branches:** In `playlist_service.py`, a comparison overlap check was flagged because the code attempted to check `current == "unknown"` after that case had already been handled.
- **Missing Annotations:** Missing return annotations (`-> None`, `-> AsyncIterator[None]`) on background task workers and async lifespans.

---

## 2. Implemented Resolutions

### 2.1 Pylance/Pyright Argument Compatibility
To prevent Pylance from raising `reportArgumentType` on untyped library parameter bindings:
- Wrapped `ydl_opts` in a `cast(Any, ydl_opts)` when instantiating the `yt_dlp.YoutubeDL` controller.
- This was systematically applied to [base.py](file:///home/gideon/Documents/CODE/Projects/nex_tract/server/app/platforms/base.py), [youtube.py](file:///home/gideon/Documents/CODE/Projects/nex_tract/server/app/platforms/youtube.py), [soundcloud.py](file:///home/gideon/Documents/CODE/Projects/nex_tract/server/app/platforms/soundcloud.py), and [facebook.py](file:///home/gideon/Documents/CODE/Projects/nex_tract/server/app/platforms/facebook.py).

### 2.2 TypedDict Mitigation and Strict Casting
To allow adding the dynamic media classification key `_nextract_media_type` to platform payloads:
- Cast the raw return dictionary from `yt_dlp` to `dict[str, Any]` inside [soundcloud.py](file:///home/gideon/Documents/CODE/Projects/nex_tract/server/app/platforms/soundcloud.py) before mutating its keys.
- Cast `content-type` header lookups in [instagram_media_proxy_service.py](file:///home/gideon/Documents/CODE/Projects/nex_tract/server/app/services/instagram_media_proxy_service.py) to `str`.
- Cast returned adapter payloads to `dict[str, Any]` across all platforms to satisfy the return signature of platform adapters.

### 2.3 Strict Exports and Imports
Resolved implicit re-export warnings by declaring `__all__` in [platform_detector.py](file:///home/gideon/Documents/CODE/Projects/nex_tract/server/app/utils/platform_detector.py):
```python
__all__ = ["detect_platform", "PlatformInfo", "PlatformValidationError"]
```
This cleanly exposes helper objects for downstream service consumers like `analyze_service.py`, `download_service.py`, and `playlist_service.py`.

### 2.4 Branch Simplification and Linting
- **Comparison Overlap:** Cleaned up `playlist_service.py` by removing the redundant check for `current == "unknown"` in `_merge_estimate_kinds`:
  ```python
  if current == "approximate" or incoming == "approximate":
      return "approximate"
  if incoming == "unknown":
      return "unknown"
  return "exact"
  ```
- **Unused Literal Imports:** Cleaned up unused imports of `typing.Literal` across SoundCloud, YouTube, and Vimeo adapters.
- **Return Type Annotations:** Added return type annotations (`-> None`) to `reset_interrupted_queue_jobs` and `shutdown_queue` inside `queue.py` and annotated the async `lifespan` in `main.py` with `-> AsyncIterator[None]`.

---

## 3. Verification & Metrics

Verification was performed locally to confirm zero type errors or test regressions:

1. **Strict Type-Checking**:
   ```bash
   uv run mypy app/ --ignore-missing-imports --strict
   # Output: Success: no issues found in 55 source files
   ```
2. **Whole-Package Type-Checking (with Tests)**:
   ```bash
   uv run mypy run_server.py tests/ app/ --ignore-missing-imports
   # Output: Success: no issues found in 70 source files
   ```
3. **Linter Validation**:
   ```bash
   uv run ruff check app/ tests/ run_server.py
   # Output: All checks passed!
   ```
4. **Test Suite Execution**:
   ```bash
   uv run pytest
   # Output: 135 passed in 12.32 seconds
   ```
