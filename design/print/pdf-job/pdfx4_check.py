#!/usr/bin/env python3
"""PDF/X-4 structure check and XMP date sync for the FORGE wall chart after PdfCraft's pass.

Why: DesignCraft's `validate-pdf` matches raw text in the file, so it can't see inside the
compressed object streams PdfCraft writes, and PdfCraft re-stamps the Info ModDate without touching
the XMP dates. This script:

  sync PDF     copies the Info /ModDate into xmp:ModifyDate and xmp:MetadataDate, in place and at the
               same byte length (the XMP stream is uncompressed), so no offset in the file moves.
  check PDF... parses each file (pypdf) and checks DesignCraft's PDF/X-4 rules on the real objects:
               PDF <= 1.6, a GTS_PDFX output intent with a destination profile, PDF/X-4 named in the
               Info dictionary and in the XMP, xmp:MetadataDate, xmpMM:VersionID, no encryption, no
               image interpolation, a TrimBox on every page, no Type 3 fonts, every font embedded, no
               DeviceRGB anywhere, plus Info/XMP agreement (title, author, subject, keywords, dates).

Run: python3 design/print/pdf-job/pdfx4_check.py sync out/forge-wall-chart.pdf
     python3 design/print/pdf-job/pdfx4_check.py check in/forge-wall-chart.pdf out/forge-wall-chart.pdf
"""
import re
import sys

from pypdf import PdfReader


def pdf_date_to_xmp(d, zulu=False):
    m = re.match(r"D:(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)", d)
    y, mo, da, h, mi, s = m.groups()
    base = f"{y}-{mo}-{da}T{h}:{mi}:{s}"
    return base + ("Z" if zulu else "+00:00")


def sync(path):
    data = bytearray(open(path, "rb").read())
    r = PdfReader(path)
    mod = r.metadata["/ModDate"]
    if not mod.endswith("Z"):
        raise SystemExit(f"unexpected ModDate {mod!r}")
    changed = 0
    for tag, zulu in (("xmp:ModifyDate", False), ("xmp:MetadataDate", True)):
        pat = re.compile(rb"(<" + tag.encode() + rb">)([^<]+)(</" + tag.encode() + rb">)")
        m = pat.search(data)
        if not m:
            raise SystemExit(f"{tag} not found as plain text")
        new = pdf_date_to_xmp(mod, zulu).encode()
        if len(new) != len(m.group(2)):
            raise SystemExit(f"{tag}: length differs ({m.group(2)!r} -> {new!r}); not patching")
        data[m.start(2):m.end(2)] = new
        changed += 1
    open(path, "wb").write(data)
    print(f"{path}: XMP ModifyDate/MetadataDate set to the Info ModDate {mod} ({changed} fields)")


def xmp_value(x, tag):
    m = re.search(r"<%s[^>]*>(.*?)</%s>" % (tag, tag), x, re.S)
    return re.sub(r"<[^>]+>", "", m.group(1)).strip() if m else None


def rgb_in_resources(res, seen, where, hits):
    if res is None:
        return
    res = res.get_object()
    for cs in (res.get("/ColorSpace") or {}).values():
        if "DeviceRGB" in str(cs.get_object()):
            hits.add(f"{where}: DeviceRGB colour space")
    for name, xo in (res.get("/XObject") or {}).items():
        xo = xo.get_object()
        key = id(xo)
        if key in seen:
            continue
        seen.add(key)
        if str(xo.get("/ColorSpace")) == "/DeviceRGB":
            hits.add(f"{where}: DeviceRGB image {name}")
        if xo.get("/Subtype") == "/Form":
            scan_content(xo.get_data(), f"{where} form {name}", hits)
            rgb_in_resources(xo.get("/Resources"), seen, where, hits)
    for sh in (res.get("/Shading") or {}).values():
        if "DeviceRGB" in str(sh.get_object().get("/ColorSpace")):
            hits.add(f"{where}: DeviceRGB shading")
    for gs in (res.get("/ExtGState") or {}).values():
        g = gs.get_object().get("/SMask")
        if g and "DeviceRGB" in str(g):
            hits.add(f"{where}: DeviceRGB soft mask")


def scan_content(raw, where, hits):
    """Flags the DeviceRGB fill/stroke operators (rg, RG) in a decoded content stream."""
    text = raw if isinstance(raw, bytes) else bytes(raw)
    for op in (b"rg", b"RG"):
        if re.search(rb"(?<![A-Za-z])" + op + rb"(?![A-Za-z])", text):
            hits.add(f"{where}: '{op.decode()}' (DeviceRGB colour operator)")


def check(path):
    issues, notes = [], []
    raw = open(path, "rb").read()
    r = PdfReader(path)
    head = raw[:8]
    if not head.startswith(b"%PDF-1.") or head[7:8] > b"6":
        issues.append(f"PDF version {head!r} is above 1.6")
    root = r.trailer["/Root"]
    ois = [o.get_object() for o in (root.get("/OutputIntents") or [])]
    xo = [o for o in ois if o.get("/S") == "/GTS_PDFX"]
    if not xo:
        issues.append("no GTS_PDFX output intent")
    elif "/DestOutputProfile" not in xo[0]:
        issues.append("the output intent has no destination profile")
    else:
        prof = xo[0]["/DestOutputProfile"].get_object()
        notes.append(f"output intent {xo[0].get('/OutputConditionIdentifier')} with an embedded "
                     f"{len(prof.get_data())}-byte ICC profile (N={prof.get('/N')}, filter {prof.get('/Filter')})")
    info = r.metadata or {}
    if info.get("/GTS_PDFXVersion") != "PDF/X-4":
        issues.append("the Info dictionary doesn't name PDF/X-4")
    if str(info.get("/Trapped")) not in ("/True", "/False"):
        issues.append("Trapped must be True or False")
    md = root.get("/Metadata")
    x = md.get_object().get_data().decode("utf8") if md else ""
    if xmp_value(x, "pdfxid:GTS_PDFXVersion") != "PDF/X-4":
        issues.append("the XMP doesn't name PDF/X-4")
    for tag in ("xmp:MetadataDate", "xmpMM:VersionID", "xmp:CreateDate", "xmp:ModifyDate", "dc:title"):
        if not xmp_value(x, tag):
            issues.append(f"the XMP has no {tag}")
    if "/Encrypt" in r.trailer:
        issues.append("the file is encrypted")
    if re.search(rb"/Interpolate\s*true", raw):
        issues.append("an image asks for interpolation")
    # Info and XMP must say the same thing
    pairs = [("/Title", "dc:title"), ("/Author", "dc:creator"), ("/Subject", "dc:description"),
             ("/Keywords", "pdf:Keywords"), ("/Producer", "pdf:Producer"), ("/Creator", "xmp:CreatorTool")]
    for ik, xk in pairs:
        iv, xv = info.get(ik), xmp_value(x, xk)
        if iv is not None and iv != xv:
            issues.append(f"Info {ik} {iv!r} != XMP {xk} {xv!r}")
    for ik, xk in (("/CreationDate", "xmp:CreateDate"), ("/ModDate", "xmp:ModifyDate")):
        iv, xv = info.get(ik), xmp_value(x, xk)
        if iv and xv and pdf_date_to_xmp(iv) != xv.replace("Z", "+00:00"):
            issues.append(f"Info {ik} {iv} != XMP {xk} {xv}")
    # pages: trim box, fonts, device RGB
    hits, seen = set(), set()
    for i, p in enumerate(r.pages, 1):
        if "/TrimBox" not in p and "/ArtBox" not in p:
            issues.append(f"page {i} has no TrimBox")
        else:
            t = [round(float(v), 2) for v in p.trimbox]
            notes.append(f"page {i}: trim {round((t[2] - t[0]) / 72 * 25.4, 1)} x {round((t[3] - t[1]) / 72 * 25.4, 1)} mm, "
                         f"bleed box {[round(float(v), 1) for v in p.bleedbox]}, media {[round(float(v), 1) for v in p.mediabox]}")
        res = p.get("/Resources")
        fonts = (res.get_object().get("/Font") or {}) if res else {}
        for fn, f in fonts.items():
            f = f.get_object()
            if f.get("/Subtype") == "/Type3":
                issues.append(f"Type 3 font {fn}")
            desc = f
            if f.get("/Subtype") == "/Type0":
                desc = f["/DescendantFonts"][0].get_object()
            fd = desc.get("/FontDescriptor")
            fd = fd.get_object() if fd else {}
            if not any(k in fd for k in ("/FontFile", "/FontFile2", "/FontFile3")):
                issues.append(f"font {f.get('/BaseFont')} is not embedded")
            else:
                notes.append(f"font {f.get('/BaseFont')} embedded")
        c = p.get_contents()
        if c is not None:
            scan_content(c.get_data(), f"page {i}", hits)
        rgb_in_resources(res, seen, f"page {i}", hits)
    issues.extend(sorted(hits))
    print(f"== {path}: {'PDF/X-4 structure OK' if not issues else 'ISSUES'}")
    for n in notes:
        print("   ", n)
    for k in ("/Title", "/Author", "/Subject", "/Keywords", "/Creator", "/Producer", "/CreationDate", "/ModDate"):
        if k in info:
            print(f"    Info {k}: {info[k]}")
    for i in issues:
        print("    !", i)
    return not issues


if __name__ == "__main__":
    cmd, paths = sys.argv[1], sys.argv[2:]
    if cmd == "sync":
        for p in paths:
            sync(p)
    else:
        ok = all([check(p) for p in paths])
        sys.exit(0 if ok else 1)
