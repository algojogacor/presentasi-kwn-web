#!/usr/bin/env python3
"""Bikin QR video untuk deck PPT_KWN, lalu verifikasi hasilnya benar-benar terbaca.

Pakai:
    python tools/make-qr.py kcZktSqKgNI assets/qr/slide04.png
    python tools/make-qr.py --check assets/qr/slide04.png

Format URL mengikuti yang dipakai deck (lihat `ytUrl` di index.html):
    https://youtu.be/<video-id>

Keluaran 400x400 tanpa quiet zone. Itu disengaja: padding disediakan oleh
kontainer `.qr` di CSS, dan QR lama juga begitu. Kalau QR gagal dipindai,
tambahkan margin lewat `--border 2` (2 modul), jangan mengubah CSS.

Catatan: decoder OpenCV butuh quiet zone, jadi verifikasi di sini menambahkan
margin putih secara virtual sebelum membaca. Kegagalan baca di sini berarti
QR-nya memang rusak, bukan karena tidak ada margin.
"""

import argparse
import sys

import cv2
import numpy as np
import segno

URL_TEMPLATE = "https://youtu.be/{}"
SIZE = 400


def build_qr(video_id: str, out_path: str, border: int = 0, error: str = "l") -> None:
    url = URL_TEMPLATE.format(video_id)
    qr = segno.make(url, error=error)

    modules = qr.symbol_size(border=border)[0]
    scale = max(1, SIZE // modules)
    actual = modules * scale

    qr.save(out_path, scale=scale, border=border, dark="#000000", light="#ffffff")
    print(f"  URL     : {url}")
    print(f"  modul   : {modules}x{modules}, error={error}, skala {scale}px")
    print(f"  berkas  : {out_path} ({actual}x{actual}px, border={border})")
    if actual != SIZE:
        print(f"  CATATAN : tidak pas {SIZE}px. Cek atribut width/height di index.html.")


def read_qr(path: str) -> str:
    """Baca QR. Tambahkan quiet zone virtual karena decoder menolak tanpa margin."""
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise SystemExit(f"tidak bisa membaca {path}")

    padded = cv2.copyMakeBorder(img, 60, 60, 60, 60, cv2.BORDER_CONSTANT, value=255)
    padded = cv2.resize(padded, None, fx=3, fy=3, interpolation=cv2.INTER_NEAREST)

    text, _points, _straight = cv2.QRCodeDetector().detectAndDecode(padded)
    return text or ""


def verify(path: str, expect: str | None = None) -> bool:
    print(f"  baca    : {path}")
    got = read_qr(path)
    if not got:
        print("  HASIL   : GAGAL, QR tidak terbaca")
        return False
    print(f"  isi     : {got}")
    if expect and got != expect:
        print(f"  HASIL   : SALAH, seharusnya {expect}")
        return False
    print("  HASIL   : benar")
    return True


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video_id", nargs="?", help="ID video YouTube, mis. kcZktSqKgNI")
    ap.add_argument("out", nargs="?", help="berkas PNG keluaran")
    ap.add_argument("--check", metavar="PNG", help="hanya membaca QR yang sudah ada")
    ap.add_argument("--border", type=int, default=0, help="margin dalam modul (default 0)")
    ap.add_argument("--error", default="l", choices=list("lmqh"),
                    help="level koreksi galat (default l, sama dengan QR lama)")
    args = ap.parse_args()

    if args.check:
        return 0 if verify(args.check) else 1

    if not args.video_id or not args.out:
        ap.error("butuh <video-id> dan <out>, atau pakai --check")

    expect = URL_TEMPLATE.format(args.video_id)
    print("MEMBUAT")
    build_qr(args.video_id, args.out, border=args.border, error=args.error)
    print("VERIFIKASI")
    return 0 if verify(args.out, expect=expect) else 1


if __name__ == "__main__":
    sys.exit(main())
