#!/usr/bin/env python3
"""Counts for the page, recomputed from disk each run: src/data.json.

  python3 tools/data.py

Sources: every git repo under ~/Developer/claude code projects (commits deduplicated by
hash, so copies of a repo count once), the NaNoBotCo repo list (gh), the memory folder
(feedback files = rules, by the day each file was born), and ~/.claude/state ledgers
(decisions, disk, sweep, ow, asks, earning). Day 1 is the first commit, 11 July 2026.
"""
import csv, datetime as dt, json, os, pathlib, subprocess
from collections import Counter, defaultdict

HOME = pathlib.Path.home()
PROJ = HOME / "Developer/claude code projects"
STATE = HOME / ".claude/state"
MEM = HOME / ".claude/projects/-Users-annikapeacock-Desktop-catalog/memory"
OUT = pathlib.Path(__file__).resolve().parent.parent / "src/data.json"
D0 = dt.date(2026, 7, 11)


def week(d):
    return (d - D0).days // 7 + 1


def tsv(name):
    with open(STATE / name, newline="") as f:
        return [r for r in csv.reader(f, delimiter="\t") if r and not r[0].startswith(("#", "date", "stamp", "at"))]


def main():
    today = dt.date.today()
    seen, day = set(), Counter()
    for repo in sorted(PROJ.iterdir()):
        if not (repo / ".git").exists():
            continue
        out = subprocess.run(["git", "-C", str(repo), "log", "--all", "--format=%H %ad", "--date=short"],
                             capture_output=True, text=True).stdout
        for line in out.splitlines():
            h, d = line.split()
            if h in seen:
                continue
            seen.add(h)
            d = dt.date.fromisoformat(d)
            if D0 <= d <= today:
                day[d] += 1
    ndays = (today - D0).days + 1
    daily = [day[D0 + dt.timedelta(i)] for i in range(ndays)]
    nweeks = week(today)
    weekly = [0] * nweeks
    for i, n in enumerate(daily):
        weekly[i // 7] += n

    gh = json.loads(subprocess.run(["gh", "repo", "list", "NaNoBotCo", "--limit", "500", "--json", "createdAt,visibility"],
                                   capture_output=True, text=True).stdout or "[]")
    repos_w = [0] * nweeks
    for r in gh:
        d = dt.date.fromisoformat(r["createdAt"][:10])
        if D0 <= d <= today:
            repos_w[week(d) - 1] += 1
    public = sum(r["visibility"] == "PUBLIC" for r in gh)

    rules_w = [0] * nweeks
    rules_before = 0
    for f in MEM.glob("feedback_*.md"):
        d = dt.date.fromtimestamp(f.stat().st_birthtime)
        if d < D0:
            rules_before += 1
        elif d <= today:
            rules_w[week(d) - 1] += 1

    dec = tsv("decisions.tsv")
    by = Counter(r[4] for r in dec if len(r) > 4)

    disk = defaultdict(lambda: 1e9)
    for r in tsv("disk.tsv"):
        try:
            disk[r[0][:10]] = min(disk[r[0][:10]], float(r[1]))
        except (ValueError, IndexError):
            pass
    swept = sum(int(r[1]) for r in tsv("sweep.tsv") if len(r) > 1 and r[1].isdigit())

    ow = tsv("ow.tsv")
    ow_usd = sum(float(r[9]) for r in ow if len(r) > 9 and r[9].replace(".", "", 1).isdigit())
    asks = tsv("asks.tsv")
    usd_in = sum(float(r[2].split()[0]) for r in tsv("earning.tsv") if len(r) > 2 and r[2].endswith("USD"))

    data = {
        "day0": D0.isoformat(), "today": today.isoformat(), "days": ndays,
        "daily": daily, "weekly": weekly, "commits": sum(daily),
        "top_day": [d.isoformat() for d, _ in day.most_common(1)] + [day.most_common(1)[0][1]],
        "repos_weekly": repos_w, "repos": len(gh), "public": public,
        "rules_weekly": rules_w, "rules_before": rules_before, "rules": rules_before + sum(rules_w),
        "decisions": len(dec), "by_her": by.get("her", 0), "by_silence": by.get("silence", 0),
        "decisions_from": min(r[0] for r in dec),
        "decision_list": sorted([r[0], "her" if r[4] == "her" else "silence"] for r in dec if len(r) > 4),
        "disk": [[k, round(v, 1)] for k, v in sorted(disk.items())],
        "disk_min": min(disk.values()), "swept_gb": round(swept / 1e9, 1),
        "ow_calls": len(ow), "ow_usd": round(ow_usd, 2),
        "asks": len(asks), "usd_in": usd_in,
    }
    OUT.write_text(json.dumps(data, separators=(",", ":")) + "\n")
    print(f"data.json: {data['commits']} commits, {data['repos']} repos, {data['rules']} rules, day {ndays}")


if __name__ == "__main__":
    main()
