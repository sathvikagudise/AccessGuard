import asyncio
import json
import sys
sys.path.append(r'c:\Users\sathv\Downloads\Creations\Audit Scraper\accessguard_backend')

from app.main import perform_batch_audit, BatchAuditRequest

async def run_test():
    req = BatchAuditRequest(urls=[
        "https://github.com",
        "https://wikipedia.org",
        "https://example.com"
    ])
    try:
        res = await perform_batch_audit(req)
        with open("py_batch_out2.txt", "w", encoding="utf-8") as f:
            json.dump(res, f, indent=2)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(run_test())
