"""Uji kelayakan embed video YouTube (authoritatif).

Dua sinyal:
  1. oEmbed -> HTTP 401 kalau embed dimatikan pemilik video.
  2. ytInitialPlayerResponse.playableInEmbed dari halaman watch.
Pakai: python tools/yt-check.py
"""
import json, pathlib, re, urllib.request, urllib.error
from playwright.sync_api import sync_playwright

IDS = {
    "rTz_jTxitwA": "Kemenkeu — [FILM PENDEK] Kenapa Ada Pajak? (6:22)",
    "3pDtl4aN0wo": "DJP — Jingle Pajak Versi Kartun (1:24)",
    "proAhdTWOH4": "Kanwil DJP Jateng I — Indonesia Tanpa Pajak? (1:46)",
    "Y2SvKeY1Gfw": "DDTC — Joni & Kawan Pajak EPS 4 (1:44)",
    "7Fv5eLLDkDU": "DDTC — Joni & Kawan Pajak EPS 15 (2:15)",
    "FOwX547KpY4": "Kemenkeu Corpu — Mengenal PNBP (8:06)",
    "SES7E2Iuf9E": "Math Asik — Kisah Tono & Tini: APBN (7:00)",
    "_YsXw4wKZKU": "SEKARANG / referensi — Pribadi Jujur Antikorupsi",
}
OUT = pathlib.Path(__file__).resolve().parent.parent / "content" / "yt-embed-check.json"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")


def oembed(vid):
    url = f"https://www.youtube.com/oembed?url=https://youtu.be/{vid}&format=json"
    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {"_http": e.code}
    except Exception as e:
        return {"_err": str(e)}


def main():
    out = {}
    with sync_playwright() as pw:
        b = pw.chromium.launch(headless=True)
        ctx = b.new_context(locale="id-ID", user_agent=UA)
        p = ctx.new_page()
        for vid, label in IDS.items():
            om = oembed(vid)
            p.goto(f"https://www.youtube.com/watch?v={vid}", wait_until="domcontentloaded", timeout=60000)
            p.wait_for_timeout(2200)
            html = p.content()
            m = re.search(r'"playableInEmbed":(true|false)', html)
            status = re.search(r'"status":"(\w+)"', html)
            rec = {
                "label": label,
                "oembed_http": om.get("_http", 200),
                "title": om.get("title"),
                "author": om.get("author_name"),
                "playableInEmbed": (m.group(1) == "true") if m else None,
                "playerStatus": status.group(1) if status else None,
            }
            rec["OK"] = (rec["oembed_http"] == 200 and rec["playableInEmbed"] is not False
                         and rec["playerStatus"] in (None, "OK"))
            out[vid] = rec
            print(f"{vid}  {'OK ' if rec['OK'] else 'NO '} embed={rec['playableInEmbed']} "
                  f"status={rec['playerStatus']} http={rec['oembed_http']}")
            print(f"          {str(rec['title'])[:60]}  —  {str(rec['author'])[:34]}")
        b.close()
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print("\ndisimpan:", OUT)


main()
