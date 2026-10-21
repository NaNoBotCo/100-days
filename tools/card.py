#!/usr/bin/env python3
"""Placeholder share cards, 1200x630: docs/card.png (English) and docs/th/card.png (Thai).
Drawn as HTML from the counts and photographed by headless Chrome, so Thai shapes properly.
Marcus makes the designed ones (ticket); his files replace these two.

  python3 tools/card.py
"""
import html, json, os, pathlib, subprocess, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
CHROME = os.environ.get("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")


def page(lang, C, D):
    m = C["meta"][lang]
    mx = max(D["daily"])
    bars = "".join(f'<i style="height:{max(2, round(v / mx * 190))}px"></i>' for v in D["daily"])
    font = "'Thonburi','Sukhumvit Set'" if lang == "th" else "'Helvetica Neue',Arial,sans-serif"
    path = "nanobotco.github.io/100-days/" + ("th/" if lang == "th" else "")
    e = html.escape
    title = e(m["title"]).replace("วันแห่ง", "วันแห่ง<br>", 1) if lang == "th" else e(m["title"])
    kick = "letter-spacing:0;font-family:" + font if lang == "th" else ""
    return f"""<!doctype html><html lang="{lang}"><meta charset="utf-8"><style>
*{{margin:0;box-sizing:border-box}} html,body{{width:1200px;height:630px;overflow:hidden}}
body{{background:linear-gradient(120deg,#140c2a,#2a0c2a);color:#fbf2e8;font-family:{font};position:relative}}
.k{{position:absolute;left:70px;top:58px;font:700 26px 'Menlo',monospace;letter-spacing:.18em;color:#ff6b9b}}
h1{{position:absolute;left:66px;top:96px;width:1060px;font-size:92px;line-height:1.02;font-weight:800;letter-spacing:-.02em}}
.l{{position:absolute;left:70px;top:330px;font-size:36px;color:#ffc53d;font-weight:600}}
.sky{{position:absolute;left:70px;right:70px;bottom:92px;height:190px;display:flex;align-items:flex-end;gap:3px}}
.sky i{{flex:1;background:#3987e5;border-radius:3px 3px 0 0;opacity:.9}}
.sky i:nth-child(7n){{background:#9a86ff}}
.f{{position:absolute;left:0;right:0;bottom:0;height:70px;background:#ff3d7f;color:#fff;font:600 28px 'Menlo',monospace;padding:19px 70px;display:flex;justify-content:space-between}}
</style><body><div class="k" style="{kick}">{e(m['kicker']).upper() if lang=='en' else e(m['kicker'])}</div>
<h1 id="h">{title}</h1><div class="l">{e(m['card_line'])}</div>
<div class="sky">{bars}</div><div class="f"><span>{path}</span><span>{D['commits']:,} · {D['rules']} · US${D['usd_in']:g}</span></div>
<script>var h=document.getElementById('h'),s=92;while(h.offsetHeight>230&&s>48){{s-=4;h.style.fontSize=s+'px';}}</script></body></html>"""


def main():
    C = json.loads((ROOT / "src/content.json").read_text())
    D = json.loads((ROOT / "src/data.json").read_text())
    with tempfile.TemporaryDirectory() as tmp:
        for lang, out in (("en", ROOT / "docs/card.png"), ("th", ROOT / "docs/th/card.png")):
            src = pathlib.Path(tmp) / f"{lang}.html"
            src.write_text(page(lang, C, D))
            subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                            "--window-size=1200,630", f"--screenshot={out}", src.as_uri()], check=True, capture_output=True, timeout=90)
            print("card", out.relative_to(ROOT), out.stat().st_size)


if __name__ == "__main__":
    main()
