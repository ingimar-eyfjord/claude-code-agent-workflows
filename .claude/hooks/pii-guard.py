#!/usr/bin/env python3
"""
pii-guard.py — a PreToolUse hook that blocks tool calls touching designated
sensitive paths, and logs every block for an audit trail.

This is DEFENSE-IN-DEPTH, not a guarantee. It reliably blocks reads of paths
you name ahead of time, but it cannot find PII that lives somewhere you didn't
list (inline in source, fixtures, logs, a new file), Bash detection is
best-effort, and any hook can be disabled (`disableAllHooks`). The real control
is data minimization: keep real PII out of the working tree (synthetic/anonymized
dev data, prod data excluded from the repo). Treat this as a backstop + audit log.

Wire it up in .claude/settings.json (see README "PII Guard Hook"):

  {
    "hooks": {
      "PreToolUse": [
        { "matcher": "Read|Edit|Write|NotebookEdit|Glob|Grep|Bash",
          "hooks": [ { "type": "command", "command": "python3 .claude/hooks/pii-guard.py" } ] }
      ]
    }
  }

Contract: exit 0 = allow; exit 2 + message on stderr = block (Claude sees the reason).
"""
import sys
import os
import json
import fnmatch
import datetime

# --- Editable denylist -------------------------------------------------------
# Glob patterns for paths that may hold PII or secrets. Tune to your project.
DENY = [
    "*.env", ".env", ".env.*",
    "*secret*", "*credential*", "*password*",
    "*.pem", "*.key", "id_rsa*", "id_ed25519*",
    "*/dumps/*", "*.dump", "*dump*.sql",
    "*/exports/*", "*/export/*",
    "*/uploads/*", "*/media/uploads/*",
    "*/backups/*", "*.bak",
    "*users*.csv", "*customers*.csv", "*members*.csv", "*contacts*.csv",
    "*pii*",
]
# Where to record blocked attempts (the audit trail).
LOG_PATH = os.environ.get("PII_GUARD_LOG", os.path.expanduser("~/.claude/pii-guard.log"))
# -----------------------------------------------------------------------------


def matches_path(path):
    """Return the first denylist pattern that matches a file path, else None."""
    if not path:
        return None
    base = os.path.basename(path)
    for pat in DENY:
        if fnmatch.fnmatch(path, pat) or fnmatch.fnmatch(base, pat) or fnmatch.fnmatch(path, "*/" + pat):
            return pat
    return None


def matches_command(command):
    """Best-effort: flag a Bash command that references a path-like denied token.

    Only path-shaped patterns (those containing '.' or '/') are checked, so a
    plain `grep -r "secret"` over source is NOT blocked — only commands that
    name a sensitive file/path. This trades some coverage for fewer false
    positives; Bash detection is inherently leaky (see module docstring).
    """
    if not command:
        return None
    for pat in DENY:
        token = pat.strip("*")
        if token and ("/" in token or "." in token) and token in command:
            return pat
    return None


def audit(tool, subject, pattern, agent):
    try:
        os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
        ts = datetime.datetime.now().isoformat(timespec="seconds")
        with open(LOG_PATH, "a") as f:
            f.write(f"{ts}\tDENY\t{agent}\t{tool}\t{subject}\tpattern={pattern}\n")
    except Exception:
        pass  # never let logging failure crash the hook


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)  # malformed payload: fail open rather than break the session

    tool = data.get("tool_name", "")
    ti = data.get("tool_input", {}) or {}
    agent = data.get("agent_type") or "main"

    subject, hit = "", None
    if tool in ("Read", "Edit", "Write", "NotebookEdit"):
        subject = ti.get("file_path") or ti.get("notebook_path") or ""
        hit = matches_path(subject)
    elif tool in ("Glob", "Grep"):
        subject = ti.get("path") or ti.get("glob") or ti.get("pattern") or ""
        hit = matches_path(subject)
    elif tool == "Bash":
        subject = ti.get("command", "")
        hit = matches_command(subject)

    if hit:
        audit(tool, subject, hit, agent)
        sys.stderr.write(
            f"[pii-guard] Blocked {tool} on '{subject}' — matches sensitive "
            f"pattern '{hit}'.\nThis path is designated as potentially holding "
            "PII or secrets. If you genuinely need it, the human should supply "
            "the data through an approved, minimized channel rather than having "
            "the agent read it directly.\n"
        )
        sys.exit(2)

    sys.exit(0)


if __name__ == "__main__":
    main()
