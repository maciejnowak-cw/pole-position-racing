#!/usr/bin/env python3
"""Stamp a new version on the site's files before publishing.

Every CSS/JS address in index.html carries ?v=<version> (the import map covers the JS modules
imported by other modules), and sw.js keeps the same version for its offline copy. A new version
makes visitors' browsers fetch the new files instead of the saved ones.

First the site is checked (scripts/check.mjs, needs Node); if anything is broken nothing is stamped.

Run from the project folder:  python3 scripts/release.py
Without the check:            python3 scripts/release.py --skip-check
"""
import re, subprocess, sys, time, pathlib

root = pathlib.Path(__file__).resolve().parent.parent

if '--skip-check' not in sys.argv:
    try:
        ok = subprocess.run(['node', str(root / 'scripts' / 'check.mjs')]).returncode == 0
    except FileNotFoundError:
        sys.exit('Brak programu Node (nodejs.org). Aby pominąć test: python3 scripts/release.py --skip-check')
    if not ok:
        sys.exit('Publikacja wstrzymana: najpierw popraw powyższe problemy.')

version = time.strftime('%Y%m%d%H%M', time.gmtime())

index = root / 'index.html'
text = re.sub(r'\?v=[0-9A-Za-z]+', f'?v={version}', index.read_text())
index.write_text(text)

sw = root / 'sw.js'
sw.write_text(re.sub(r"const VERSION = '[^']*'", f"const VERSION = '{version}'", sw.read_text()))

print(f'version {version}')
