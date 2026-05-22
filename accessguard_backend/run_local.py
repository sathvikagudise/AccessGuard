import os
from pathlib import Path
from fastapi.responses import FileResponse
from app.main import app

frontend_dir = Path(__file__).resolve().parent.parent / "frontend"

@app.get("/{full_path:path}", include_in_schema=False)
async def serve_frontend(full_path: str):
    file_path = frontend_dir / full_path
    if file_path.is_file():
        return FileResponse(str(file_path))
    index = frontend_dir / "index.html"
    if index.is_file():
        return FileResponse(str(index))
    return FileResponse(str(frontend_dir / "404.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=int(os.getenv("PORT", 8765)))
