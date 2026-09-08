import urllib.request
import urllib.error
import json

urls = [
    ('GET', 'http://127.0.0.1:8000/api/health', None),
    ('GET', 'http://127.0.0.1:8000/api/wells', None),
    ('GET', 'http://127.0.0.1:8000/api/wells/field-stats', None),
    ('GET', 'http://127.0.0.1:8000/api/wells/field/production-trend?days=30', None),
    ('GET', 'http://127.0.0.1:8000/api/wells/BGW-001', None),
    ('GET', 'http://127.0.0.1:8000/api/wells/BGW-001/twin-state', None),
    ('GET', 'http://127.0.0.1:8000/api/wells/BGW-001/css-cycles', None),
    ('GET', 'http://127.0.0.1:8000/api/wells/BGW-001/srp?days=30', None),
    ('GET', 'http://127.0.0.1:8000/api/wells/BGW-001/production?days=30', None),
    ('GET', 'http://127.0.0.1:8000/api/wells/BGW-001/telemetry?days=7', None),
    ('GET', 'http://127.0.0.1:8000/api/alerts', None),
    ('GET', 'http://127.0.0.1:8000/api/approvals', None),
    ('GET', 'http://127.0.0.1:8000/api/simulation/preset/BGW-001', None),
    ('POST', 'http://127.0.0.1:8000/api/simulation/run', {
        'well_id': 'BGW-001',
        'steam_volume_ton': 735,
        'injection_pressure_bar': 21,
        'soak_time_hr': 64,
        'spm': 5.1,
        'stroke_length_in': 66,
        'vfd_frequency_hz': 36
    }),
]

def test():
    for method, url, body in urls:
        try:
            data = json.dumps(body).encode('utf-8') if body else None
            headers = {'Content-Type': 'application/json'} if body else {}
            req = urllib.request.Request(url, data=data, headers=headers, method=method)
            with urllib.request.urlopen(req) as resp:
                code = resp.getcode()
                print(f"{method:<4} {url:<60} -> {code} OK")
        except urllib.error.HTTPError as e:
            msg = e.read().decode('utf-8')
            print(f"{method:<4} {url:<60} -> ERROR {e.code}: {msg}")
        except Exception as e:
            print(f"{method:<4} {url:<60} -> FAILED: {e}")

if __name__ == "__main__":
    test()
