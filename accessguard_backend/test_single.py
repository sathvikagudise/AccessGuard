import asyncio
import json
import sys
sys.path.append(r'c:\Users\sathv\Downloads\Creations\Audit Scraper\accessguard_backend')

from app.main import perform_audit, AuditRequest

async def run_test():
    req = AuditRequest(url="https://github.com")
    try:
        res = await perform_audit(req)
        with open("single_audit_out.txt", "w", encoding="utf-8") as f:
            json.dump(res, f, indent=2)
        print("Audit completed successfully")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(run_test())