from fastapi import FastAPI
from app.core.config import settings
from fastapi.middleware.cors import CORSMiddleware
from app import routes

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.auth_router)
app.include_router(routes.reviews_router)

@app.get("/health")
def health_check():
    return {"status": "ok", "environment": settings.APP_ENV, "project": settings.APP_NAME}
