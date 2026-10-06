#!/usr/bin/env python3
"""Static server for the showroom that makes the browser check every file on each load.

    python3 tools/serve.py [port] [directory]        defaults: 8013 site

Plain `python3 -m http.server` sends no cache headers, so Chrome keeps CSS and JS
modules for a while on its own judgement. After an edit the page can then load
as a mix of old and new files (seen 2026-10-06: yesterday's styles and room code
with today's markup). `no-cache` still lets it keep the big models, it just has
to ask whether they changed.
"""
import functools
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8013
root = sys.argv[2] if len(sys.argv) > 2 else 'site'
print(f'Serving {root} on http://localhost:{port}/ (Ctrl-C to stop)')
ThreadingHTTPServer(('', port), functools.partial(Handler, directory=root)).serve_forever()
