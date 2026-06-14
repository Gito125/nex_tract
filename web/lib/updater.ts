/**
 * Auto-update utilities for the Tauri desktop app.
 * Handles version comparison and skipped-version persistence.
 */

const SKIPPED_VERSIONS_KEY = "nextract-skipped-versions";

export function getSkippedVersions(): string[] {
  try {
    const raw = localStorage.getItem(SKIPPED_VERSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function skipVersion(version: string): void {
  const skipped = getSkippedVersions();
  if (!skipped.includes(version)) {
    skipped.push(version);
    localStorage.setItem(SKIPPED_VERSIONS_KEY, JSON.stringify(skipped));
  }
}

export function isVersionSkipped(version: string): boolean {
  return getSkippedVersions().includes(version);
}

export function clearSkippedVersions(): void {
  localStorage.removeItem(SKIPPED_VERSIONS_KEY);
}

/** Compare semver strings. Returns true if remote > current. */
export function isNewerVersion(current: string, remote: string): boolean {
  const parse = (v: string) => v.replace(/^v/, "").split(".").map(Number);
  const [cMaj, cMin, cPat] = parse(current);
  const [rMaj, rMin, rPat] = parse(remote);
  if (rMaj !== cMaj) return rMaj > cMaj;
  if (rMin !== cMin) return rMin > cMin;
  return rPat > cPat;
}

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  body: string;
}

/** Fallback check via GitHub API for platforms without auto-update (deb/rpm). */
export async function checkGitHubRelease(): Promise<GitHubRelease | null> {
  try {
    const resp = await fetch(
      "https://api.github.com/repos/Gito125/nex_tract/releases/latest",
      { headers: { Accept: "application/vnd.github.v3+json" } },
    );
    if (!resp.ok) return null;
    return resp.json();
  } catch {
    return null;
  }
}
