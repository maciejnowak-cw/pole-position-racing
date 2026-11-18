#!/usr/bin/env python3
"""Stamp a new version on the site's files before publishing.

Every CSS/JS address in index.html carries ?v=<version> (the import map covers the JS modules
imported by other modules), and sw.js keeps the same version for its offline copy. A new version
makes visitors' browsers fetch the new files instead of the saved ones.

Run from the project folder:  python3 scripts/release.py
"""
import re, time, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
version = time.strftime('%Y%m%d%H%M', time.gmtime())

index = root / 'index.html'
text = re.sub(r'\?v=[0-9A-Za-z]+', f'?v={version}', index.read_text())
index.write_text(text)

sw = root / 'sw.js'
sw.write_text(re.sub(r"const VERSION = '[^']*'", f"const VERSION = '{version}'", sw.read_text()))

print(f'version {version}')
