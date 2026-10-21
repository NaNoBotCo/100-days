#!/usr/bin/env python3
"""Build docs/index.html (English) and docs/th/index.html (Thai) from src/.

  python3 tools/data.py     # recount from git and the ledgers
  python3 tools/build.py    # write the pages, llms.txt, sitemap.xml, robots.txt

Counts in the copy are {tokens} filled from src/data.json, so no number is typed twice.
"""
import html, json, pathlib, re, statistics, datetime as dt

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, DOCS = ROOT / "src", ROOT / "docs"
URL = "https://nanobotco.github.io/100-days/"
REPO = "https://github.com/NaNoBotCo/100-days"
TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]


def tokens(d):
    w, r = d["weekly"], d["repos_weekly"]
    t = {"commits": f"{d['commits']:,}", "top": str(d["top_day"][1]), "median": f"{statistics.median(d['daily']):g}",
         "public": str(d["public"]), "repos": str(d["repos"]), "rules": str(d["rules"]), "usd": f"{d['usd_in']:g}",
         "asks": str(d["asks"]), "swept": f"{d['swept_gb']:g}", "ow_calls": str(d["ow_calls"]), "ow_usd": f"{d['ow_usd']:.2f}",
         "decisions": str(d["decisions"]), "by_her": str(d["by_her"]), "by_silence": str(d["by_silence"]), "days": str(d["days"])}
    for i in range(len(w)):
        t[f"w{i+1}"] = f"{w[i]:,}"
        t[f"r{i+1}"] = str(r[i])
    return t


def fill(s, t):
    for k, v in t.items():
        s = s.replace("{" + k + "}", v)
    left = re.findall(r"\{[a-z_0-9]+\}", s)
    assert not left, left
    return s


def day_label(iso, lang):
    d = dt.date.fromisoformat(iso)
    return f"{d.day} {TH_MONTHS[d.month-1]}" if lang == "th" else d.strftime("%-d %b")


def page(lang, C, D):
    m = C["meta"][lang]
    t = tokens(D)
    e = lambda s: html.escape(fill(s, t), quote=False)
    a = lambda s: html.escape(fill(s, t), quote=True)
    base = "" if lang == "en" else "../"
    url = URL if lang == "en" else URL + "th/"
    built = day_label(D["today"], lang)

    toc = "".join(
        f'<li><a href="#w{L["w"]}"><b>{L["w"]}</b><span>{e(L[lang]["title"])}</span></a></li>' for L in C["lessons"])

    lessons = []
    for L in C["lessons"]:
        x = L[lang]
        allow_on = "<!-- stylecheck: allow-start -->" if L.get("allow") else ""
        allow_off = "<!-- stylecheck: allow-end -->" if L.get("allow") else ""
        quote = ""
        if x.get("quote"):
            quote = (f'<blockquote class="quote" lang="en"><p>“{e(x["quote"])}”</p>'
                     f'<footer>NaN · {e(x["quote_date"])}</footer></blockquote><!-- stylecheck: allow — her own words -->')
        toy = f'<div class="toy" data-toy="{L["toy"]}"></div>' if L.get("toy") else ""
        lessons.append(f"""{allow_on}<article class="lesson" id="w{L['w']}" style="--wk:{L['w']}">
<header class="lh"><div class="wk"><span>{e(m['week'])}</span><b>{L['w']}</b></div>
<div><p class="dates">{e(L['dates'][lang])} · <span class="wkc">{t['w'+str(L['w'])]} {e(m['c_commits']).lower() if lang=='en' else e(m['c_commits'])}</span></p>
<h3>{e(x['title'])}</h3></div></header>
<div class="lbody"><div class="ltext">
<p class="lab">{e(m['happened'])}</p><p>{e(x['happened'])}</p>{quote}
<p class="lab">{e(m['lesson'])}</p><p class="big">{e(x['lesson'])}</p>
<p class="lab">{e(m['now'])}</p><p class="nowp">{e(x['now'])}</p></div>{toy}</div>
</article>{allow_off}""")

    tat = "".join(
        f'<li class="story" tabindex="0" style="--i:{i}"><time>{e(s["d"][lang])}</time><h4>{e(s[lang][0])}</h4><p>{e(s[lang][1])}</p></li>'
        for i, s in enumerate(C["tattler"]))
    ticker = " ★ ".join(e(s[lang][0]) for s in C["tattler"])

    # what app.js needs: this language's labels and the counts
    boot = {"lang": lang, "m": {k: fill(v, t) for k, v in m.items()},
            "weeks": [{"w": L["w"], "dates": L["dates"][lang], "title": fill(L[lang]["title"], t)} for L in C["lessons"]],
            "d": D}
    boot_json = json.dumps(boot, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

    alt_en, alt_th = URL, URL + "th/"
    return f"""<!doctype html>
<html lang="{m['lang']}" translate="no" class="notranslate">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="google" content="notranslate">
<title>{e(m['title'])} · {e(m['kicker'])}</title>
<meta name="description" content="{a(m['desc'])}">
<meta name="theme-color" content="#ff3d7f">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="en" href="{alt_en}"><link rel="alternate" hreflang="th" href="{alt_th}"><link rel="alternate" hreflang="x-default" href="{alt_en}">
<meta property="og:type" content="article"><meta property="og:site_name" content="NaNoBotCo">
<meta property="og:title" content="{a(m['title'])}"><meta property="og:description" content="{a(m['desc'])}">
<meta property="og:url" content="{url}"><meta property="og:locale" content="{m['locale']}">
<meta property="og:image" content="{url}card.png"><meta property="og:image:secure_url" content="{url}card.png"><meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{a(m['title'])}: {a(m['card_line'])}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{a(m['title'])}"><meta name="twitter:description" content="{a(m['desc'])}"><meta name="twitter:image" content="{url}card.png">
<link rel="icon" href="{base}icon.svg" type="image/svg+xml">
<link rel="alternate" type="text/plain" href="{URL}llms.txt" title="llms.txt">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,800&family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Sans+Thai:wght@400;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{base}style.css">
<script>if(/translate\\.goog$/.test(location.hostname))location.replace("{url}")</script>
<script type="application/ld+json">{json.dumps({"@context": "https://schema.org", "@type": "Article", "headline": fill(m["title"], t), "description": fill(m["desc"], t), "inLanguage": lang, "url": url, "image": url + "card.png", "author": {"@type": "Person", "name": "NaN"}, "publisher": {"@type": "Organization", "name": "NaNoBotCo"}, "dateModified": D["today"], "license": "https://creativecommons.org/licenses/by/4.0/"}, ensure_ascii=False)}</script>
</head>
<body class="lang-{lang}">
<header class="top"><a class="brand" href="{base or './'}">100<span>days</span></a>
<nav><a href="#weeks">{e(m['toc'])}</a><a href="#tattler">{e(m['tattler'])}</a><a class="lang" href="{m['other_href']}" hreflang="{'th' if lang=='en' else 'en'}">{e(m['other'])}</a></nav></header>

<section class="hero">
<p class="kicker">{e(m['kicker'])}</p>
<h1>{e(m['title'])}</h1>
<p class="daycount" aria-live="off"><span>{e(m['dayword'])}</span> <b id="dayn">{D['days']}</b></p>
<p class="lede">{e(m['lede'])}</p>
<ul class="stats">
<li><b data-n="{D['commits']}">{t['commits']}</b><span>{e(m['stat_commits'])}</span></li>
<li><b data-n="{D['repos']}">{D['repos']}</b><span>{e(m['stat_repos'])}</span></li>
<li><b data-n="{D['rules']}">{D['rules']}</b><span>{e(m['stat_rules'])}</span></li>
<li class="cash"><b>US${t['usd']}</b><span>{e(m['stat_usd'])}</span></li></ul>
<figure class="skyline"><div id="skyline" class="chart" role="img" aria-label="{a(m['skyline'])}"></div><figcaption>{e(m['skyline'])}</figcaption></figure>
<p class="byline">{e(m['byline'])} · {e(m['built'])} {built}</p>
</section>

<section class="band" id="band1" aria-hidden="true"><div class="bandtxt"><b>{t['commits']}</b><span>{e(m['stat_commits'])}</span></div></section>

<section class="wrap" id="weeks">
<h2>{e(m['toc'])}</h2>
<ol class="toc">{toc}</ol>
<h2 class="sub">{e(m['weeks_h'])}</h2>
<p class="note">{e(m['weeks_note'])}</p>
<div class="multiples">
<figure><figcaption>{e(m['c_commits'])}</figcaption><div class="chart" id="ch-commits"></div></figure>
<figure><figcaption>{e(m['c_rules'])}</figcaption><div class="chart" id="ch-rules"></div></figure>
<figure><figcaption>{e(m['c_repos'])}</figcaption><div class="chart" id="ch-repos"></div></figure>
</div>
<details class="tbl"><summary>{e(m['table'])}</summary><div id="weektable"></div></details>
</section>

<section class="wrap lessons">
{chr(10).join(lessons[:9])}
</section>

<section class="band" id="band2" aria-hidden="true"><div class="bandtxt"><b>{D['rules']}</b><span>{e(m['stat_rules'])}</span></div></section>

<section class="wrap lessons">
{chr(10).join(lessons[9:])}
</section>

<section class="tattler" id="tattler">
<div class="ticker" aria-hidden="true"><div><span>{ticker} ★ </span><span>{ticker} ★ </span></div></div>
<div class="wrap"><h2>{e(m['tattler'])}</h2><p class="note">{e(m['tattler_sub'])}</p>
<ul class="stories">{tat}</ul></div>
</section>

<footer class="foot wrap">
<div class="sharebar" data-url="{url}" data-title="{a(m['title'])}"><b>{e(m['share'])}</b></div>
<h2>{e(m['sources_h'])}</h2><p>{e(m['sources'])}</p>
<p>{e(m['licence'])} · <a href="{REPO}">{e(m['source_link'])}</a> · <a href="{URL}llms.txt">llms.txt</a></p>
</footer>
<script id="boot" type="application/json">{boot_json}</script>
<script src="{base}app.js" defer></script>
</body></html>
"""


def llms(C, D):
    t = tokens(D)
    out = [f"# {C['meta']['en']['title']} · {C['meta']['en']['kicker']}", "",
           f"> {fill(C['meta']['en']['desc'], t)}", "",
           f"English: {URL} · Thai: {URL}th/ · Source: {REPO}", f"Counted {D['today']} by tools/data.py.", ""]
    for L in C["lessons"]:
        x = L["en"]
        out += [f"## Week {L['w']} ({L['dates']['en']}): {x['title']}", "", fill(x["happened"], t), "",
                f"Lesson: {fill(x['lesson'], t)}", f"Running now: {fill(x['now'], t)}", ""]
    out += ["## Gossip", ""] + [f"- {s['d']['en']}: {fill(s['en'][0], t)}. {fill(s['en'][1], t)}" for s in C["tattler"]]
    return "\n".join(out) + "\n"


def main():
    C = json.loads((SRC / "content.json").read_text())
    D = json.loads((SRC / "data.json").read_text())
    (DOCS / "th").mkdir(parents=True, exist_ok=True)
    (DOCS / "index.html").write_text(page("en", C, D))
    (DOCS / "th/index.html").write_text(page("th", C, D))
    for f in ("style.css", "app.js", "icon.svg"):
        (DOCS / f).write_text((SRC / f).read_text())
    (DOCS / "llms.txt").write_text(llms(C, D))
    (DOCS / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {URL}sitemap.xml\n")
    (DOCS / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        f"<url><loc>{URL}</loc><lastmod>{D['today']}</lastmod></url><url><loc>{URL}th/</loc><lastmod>{D['today']}</lastmod></url></urlset>\n")
    print("built docs/index.html docs/th/index.html")


if __name__ == "__main__":
    main()
