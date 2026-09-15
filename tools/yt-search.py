"""Cari kandidat video YouTube untuk slide 04 (pendapatan negara).
Mengembalikan id, judul, kanal, durasi. Tidak menyentuh index.html.
Pakai: python tools/yt-search.py
"""
import json, pathlib, re, sys, urllib.parse
from playwright.sync_api import sync_playwright

QUERIES = [
    "dari mana uang negara berasal pajak animasi Indonesia",
    "fungsi pajak untuk pembangunan negara animasi",
    "apa itu pajak edukasi animasi DJP",
    "kesadaran pajak animasi pelajar Indonesia",
    "pajak membangun negeri animasi Kemenkeu",
]
OUT = pathlib.Path(__file__).resolve().parent.parent / "content" / "yt-candidates.json"

def run():
    seen, rows = set(), []
    with sync_playwright() as pw:
        b = pw.chromium.launch(headless=True)
        ctx = b.new_context(
            locale="id-ID",
            user_agent=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"),
            viewport={"width": 1440, "height": 900},
        )
        p = ctx.new_page()
        for q in QUERIES:
            url = "https://www.youtube.com/results?search_query=" + urllib.parse.quote(q)
            try:
                p.goto(url, wait_until="domcontentloaded", timeout=45000)
                p.wait_for_timeout(2500)
                txt = p.content()
            except Exception as e:
                print("GAGAL", q, e); continue
            m = re.search(r"var ytInitialData = (\{.*?\});</script>", txt, re.S)
            if not m:
                print("no ytInitialData", q); continue
            data = json.loads(m.group(1))
            for r in (data.get("contents", {})
                          .get("twoColumnSearchResultsRenderer", {})
                          .get("primaryContents", {})
                          .get("sectionListRenderer", {})
                          .get("contents", [])):
                for it in r.get("itemSectionRenderer", {}).get("contents", []):
                    v = it.get("videoRenderer")
                    if not v: continue
                    vid = v.get("videoId")
                    if not vid or vid in seen: continue
                    seen.add(vid)
                    title = "".join(x.get("text", "") for x in
                                    v.get("title", {}).get("runs", []))
                    ch = (v.get("ownerText", {}).get("runs") or [{}])[0].get("text", "")
                    dur = v.get("lengthText", {}).get("simpleText", "")
                    views = v.get("viewCountText", {}).get("simpleText", "")
                    rows.append({"id": vid, "title": title, "channel": ch,
                                 "duration": dur, "views": views, "query": q})
            print(f"[{q}] -> total {len(rows)}")
        b.close()
    OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    for r in rows:
        print(f"{r['id']}  {r['duration']:<7s} {r['channel'][:34]:<34s} {r['title'][:64]}")
    print("\ndisimpan:", OUT)

if __name__ == "__main__":
    run()
