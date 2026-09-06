import time
import urllib.request
import json

endpoints = [
    "http://127.0.0.1:8000/api/wells",
    "http://127.0.0.1:8000/api/wells/field-stats",
    "http://127.0.0.1:8000/api/wells/field/production-trend?days=30",
    "http://127.0.0.1:8000/api/wells/BGW-001/twin-state",
    "http://127.0.0.1:8000/api/approvals",
]

def bench():
    print(f"{'Endpoint':<45} | {'Run 1':<10} | {'Run 2 (Warm)':<12}")
    print("-" * 75)
    for url in endpoints:
        # Run 1
        t0 = time.perf_counter()
        with urllib.request.urlopen(url) as resp:
            data = resp.read()
        t1 = time.perf_counter()
        r1_ms = (t1 - t0) * 1000

        # Run 2 (Warm / Cached)
        t0 = time.perf_counter()
        with urllib.request.urlopen(url) as resp:
            data = resp.read()
        t1 = time.perf_counter()
        r2_ms = (t1 - t0) * 1000

        short_url = url.replace("http://127.0.0.1:8000", "")
        print(f"{short_url:<45} | {r1_ms:7.1f} ms | {r2_ms:7.1f} ms")

if __name__ == "__main__":
    bench()
