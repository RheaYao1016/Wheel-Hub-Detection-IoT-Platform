#!/usr/bin/env python3
"""
Lightweight reverse proxy for cloud subdirectory routing.
No external dependencies (stdlib only).

Routes:
  /wheelhub/     -> http://127.0.0.1:3001/
  /wheelhub-api/ -> http://127.0.0.1:18081/
"""
import http.client
import socket
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, urlunparse

UPSTREAMS = {
    "/wheelhub/": {"host": "127.0.0.1", "port": 3001, "strip": ""},
}

DEFAULT_RESPONSE = b"""<!doctype html>
<html><head><title>Cloud Proxy</title></head>
<body>
<h1>Cloud Proxy Running</h1>
<ul>
  <li><a href="/wheelhub/">Wheel Hub Frontend</a></li>
  <li><a href="/wheelhub-api/">Wheel Hub Backend API</a></li>
</ul>
</body></html>
"""


class ProxyHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))

    def _match_upstream(self, path):
        for prefix, upstream in sorted(UPSTREAMS.items(), key=lambda x: -len(x[0])):
            if path.startswith(prefix.rstrip("/") + "/") or path == prefix.rstrip("/"):
                return upstream
        return None

    def _rewrite_path(self, path, upstream):
        strip = upstream["strip"]
        if path.startswith(strip + "/"):
            return path[len(strip):]
        if path == strip:
            return "/"
        return path

    def _forward(self, method):
        parsed = urlparse(self.path)
        upstream = self._match_upstream(parsed.path)
        if upstream is None:
            if parsed.path in ("", "/"):
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(DEFAULT_RESPONSE)))
                self.end_headers()
                self.wfile.write(DEFAULT_RESPONSE)
                return
            self.send_error(404, "Not Found")
            return

        new_path = self._rewrite_path(parsed.path, upstream)
        if parsed.query:
            new_path += "?" + parsed.query

        headers = {}
        for key, value in self.headers.items():
            if key.lower() in ("host", "content-length", "transfer-encoding", "connection"):
                continue
            headers[key] = value
        headers["Host"] = f"{upstream['host']}:{upstream['port']}"
        headers["X-Forwarded-For"] = self.client_address[0]

        body = None
        content_length = self.headers.get("Content-Length")
        if content_length:
            body = self.rfile.read(int(content_length))

        try:
            conn = http.client.HTTPConnection(upstream["host"], upstream["port"], timeout=30)
            conn.request(method, new_path, body=body, headers=headers)
            resp = conn.getresponse()

            self.send_response(resp.status)
            for key, value in resp.getheaders():
                if key.lower() in ("transfer-encoding", "connection", "content-length"):
                    continue
                self.send_header(key, value)
            data = resp.read()
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except Exception as exc:
            self.send_error(502, f"Bad Gateway: {exc}")
        finally:
            try:
                conn.close()
            except Exception:
                pass

    def do_GET(self):
        self._forward("GET")

    def do_HEAD(self):
        self._forward("HEAD")

    def do_POST(self):
        self._forward("POST")

    def do_PUT(self):
        self._forward("PUT")

    def do_PATCH(self):
        self._forward("PATCH")

    def do_DELETE(self):
        self._forward("DELETE")

    def do_OPTIONS(self):
        self._forward("OPTIONS")


class ReusableServer(ThreadingHTTPServer):
    allow_reuse_address = True


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    server = ReusableServer(("0.0.0.0", port), ProxyHandler)
    print(f"Cloud proxy listening on 0.0.0.0:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()


if __name__ == "__main__":
    main()
