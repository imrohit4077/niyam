"""One-off: login → POST job attachment upload → GET /files → list attachments."""
from __future__ import annotations

import json
import sys

import httpx

BASE = "http://127.0.0.1:8000/api/v1"


def main() -> int:
    with httpx.Client(timeout=30.0) as c:
        r = c.get("http://127.0.0.1:8000/health")
        r.raise_for_status()
        print("health:", r.json())

        r = c.post(
            f"{BASE}/auth/login",
            json={"email": "admin@example.com", "password": "password123"},
        )
        print("login status:", r.status_code)
        if r.status_code != 200:
            print(r.text)
            return 1
        body = r.json()
        if not body.get("success"):
            print("login failed:", body)
            return 1
        token = body["data"]["access_token"]
        h = {"Authorization": f"Bearer {token}"}

        r = c.get(f"{BASE}/jobs", headers=h)
        r.raise_for_status()
        jobs_body = r.json()
        if not jobs_body.get("success"):
            print("jobs list failed:", jobs_body)
            return 1
        jobs = jobs_body["data"]
        if not jobs:
            print("No jobs in DB; seed the app first.")
            return 2
        job_id = jobs[0]["id"]
        print("using job_id:", job_id, "title:", jobs[0].get("title"))

        pdf = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"
        files = {"file": ("jd_test_upload.pdf", pdf, "application/pdf")}
        data = {"name": "JD API test", "doc_type": "jd_pdf"}
        r = c.post(
            f"{BASE}/jobs/{job_id}/attachments/upload",
            headers=h,
            data=data,
            files=files,
        )
        print("upload status:", r.status_code)
        if r.status_code not in (200, 201):
            print(r.text)
            return 1
        up = r.json()
        if not up.get("success"):
            print("upload failed:", up)
            return 1
        att = up["data"]
        print("attachment row:", json.dumps(att, indent=2)[:800])

        file_url = att["file_url"]
        r2 = c.get(f"http://127.0.0.1:8000{file_url}")
        print("GET file:", r2.status_code, "bytes:", len(r2.content))
        if r2.status_code != 200:
            return 1

        r3 = c.get(f"{BASE}/jobs/{job_id}/attachments", headers=h)
        r3.raise_for_status()
        lst = r3.json()
        ids = [x["id"] for x in lst["data"]]
        ok = att["id"] in ids
        print("list contains new attachment:", ok, "(total", len(ids), ")")
        return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
