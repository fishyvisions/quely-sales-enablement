#!/usr/bin/env python3
"""Turn a design Block *.dc.html into a self-contained, servable page.

The design blocks render via the dc-runtime (support.js), which needs React,
ReactDOM and Babel present as globals. This script:
  - loads the raw block (either a raw .dc.html, or a DesignSync get_file JSON
    result with a {"content": ...} field),
  - injects the React/ReactDOM/Babel CDN scripts before support.js,
  - rewrites the design-system CSS path and asset paths to the app's /assets,
  - writes public/blocks/<slug>.html.

Usage: python scripts/blockify.py <src-file> <slug>
"""
import sys, json, re, os

CDN = (
    '<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>\n'
    '<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>\n'
    '<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>\n'
)

def main():
    src, slug = sys.argv[1], sys.argv[2]
    raw = open(src, encoding='utf-8').read()
    if raw.lstrip().startswith('{'):
        raw = json.loads(raw)['content']

    # design-system CSS -> the app's copy
    raw = re.sub(r'_ds/quely-ds-final-[^/"\']+/colors_and_type\.css', '/assets/colors_and_type.css', raw)

    # drop the design-system component bundle (blocks render from inline styles +
    # Phosphor; the bundle is Claude-Design editor tooling not needed to render)
    raw = re.sub(r'\s*<script src="_ds/quely-ds-final-[^"]*_ds_bundle\.js"></script>', '', raw)

    # asset references (quoted or in url(...)) -> absolute /assets
    raw = raw.replace("url('assets/", "url('/assets/").replace('url("assets/', 'url("/assets/')
    raw = raw.replace('"assets/', '"/assets/').replace("'assets/", "'/assets/")

    # make the runtime's dependencies available before support.js loads
    raw = raw.replace('<script src="./support.js"></script>', CDN + '<script src="./support.js"></script>', 1)

    out_dir = os.path.join('public', 'blocks')
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, slug + '.html')
    open(out, 'w', encoding='utf-8', newline='').write(raw)
    # quick sanity: leftover un-fixed asset paths?
    leftover = len(re.findall(r'["\']assets/', raw)) + len(re.findall(r'url\(["\']?assets/', raw))
    print(f'wrote {out} ({len(raw)} bytes) | remaining bare "assets/" refs: {leftover}')

if __name__ == '__main__':
    main()
