"""
Polaris Backend — Uvicorn Entry Point
"""
import sys
from pathlib import Path

# Ensure backend root is on sys.path regardless of execution method
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

import uvicorn
from app.config.settings import settings
from app.main import create_app

app = create_app()

if __name__ == "__main__":
    uvicorn.run(
        "app.server:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=not settings.is_production,
        log_level="warning" if settings.is_production else "info",
    )
