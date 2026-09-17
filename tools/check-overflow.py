import sys, json, pathlib, time
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent

VIEWPORTS = [
    ("1920x1080 (FHD)", 1920, 1080),
    ("1600x900  (Default)", 1600, 900),
    ("1366x768  (Laptop)", 1366, 768),
    ("1280x720  (HD 720p)", 1280, 720),
]
SETTLE = 60

def main():
    url = (ROOT / "index.html").resolve().as_uri()
    total_problems = 0

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=["--use-gl=angle", "--use-angle=swiftshader",
                  "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
                  "--allow-file-access-from-files"],
        )
        for label, W, H in VIEWPORTS:
            ctx = browser.new_context(viewport={"width": W, "height": H}, device_scale_factor=1)
            page = ctx.new_page()
            page.emulate_media(reduced_motion="reduce")
            page.goto(url, wait_until="load", timeout=60000)
            page.wait_for_timeout(250)

            n = page.evaluate("() => document.querySelectorAll('.slide').length")
            print(f"\n========================================================", flush=True)
            print(f"Testing {label} - {n} slides", flush=True)
            print(f"========================================================", flush=True)
            problems = []

            for i in range(n):
                page.evaluate(f"""() => {{
                  const d = document.getElementById('deck');
                  d.style.scrollBehavior = 'auto';
                  d.scrollTop = {i} * d.clientHeight;
                  d.style.scrollBehavior = '';
                }}""")
                page.wait_for_timeout(SETTLE)

                rep = page.evaluate("""(idx) => {
                  const s = document.querySelectorAll('.slide')[idx];
                  s.classList.add('in');
                  const r = s.getBoundingClientRect();
                  const out = [];
                  s.querySelectorAll('*').forEach(el => {
                    const cs = getComputedStyle(el);
                    if (cs.display === 'none' || cs.position === 'fixed') return;
                    const b = el.getBoundingClientRect();
                    if (b.width === 0 || b.height === 0) return;
                    const overR = b.right  - r.right;
                    const overB = b.bottom - r.bottom;
                    const overL = r.left - b.left;
                    const overT = r.top  - b.top;
                    if (overR > 3 || overB > 3 || overL > 3 || overT > 3) {
                      out.push({
                        tag: el.tagName.toLowerCase(),
                        cls: (el.className || '').toString().slice(0, 40),
                        txt: (el.textContent || '').trim().slice(0, 34),
                        over: {r: Math.round(overR), b: Math.round(overB), l: Math.round(overL), t: Math.round(overT)}
                      });
                    }
                  });
                  return {
                    n: idx + 1,
                    title: (s.querySelector('h1,h2') || {}).textContent || '',
                    scrollH: s.scrollHeight, clientH: s.clientHeight,
                    hasIn: s.classList.contains('in'),
                    overflow: s.scrollHeight > s.clientHeight + 2,
                    leaked: out.slice(0, 6)
                  };
                }""", i)

                flag = ""
                if rep["overflow"]:
                    flag += " OVERFLOW"
                    problems.append((rep["n"], "overflow", rep))
                if rep["leaked"]:
                    flag += " BOCOR"
                    problems.append((rep["n"], "leaked", rep))

                title = " ".join(rep["title"].split())[:42]
                if flag:
                    print(f"Slide {rep['n']:02d}: {title:<44s} -> {flag}", flush=True)
                    for L in rep["leaked"]:
                        print(f"      [leak] <{L['tag']} class='{L['cls']}'> \"{L['txt']}\" {L['over']}", flush=True)
                else:
                    print(f"Slide {rep['n']:02d}: OK ({title})", flush=True)

            if problems:
                print(f"[{label}] PROBLEMS: {len(problems)}", flush=True)
                total_problems += len(problems)
            else:
                print(f"[{label}] ALL 22 SLIDES CLEAN (0 issues)", flush=True)
            ctx.close()

        browser.close()

    print(f"\nFINAL VERDICT: {total_problems} TOTAL ISSUES ACROSS ALL VIEWPORTS", flush=True)
    return 1 if total_problems > 0 else 0

if __name__ == "__main__":
    sys.exit(main())
