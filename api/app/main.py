from fastapi import FastAPI
from app.core.config import settings

app = FastAPI(title=settings.APP_NAME)

@app.get("/health")
def health_check():
    return {"status": "ok", "environment": settings.APP_ENV, "project": settings.APP_NAME}
