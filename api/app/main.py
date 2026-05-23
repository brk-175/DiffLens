from fastapi import FastAPI

app = FastAPI(title="DiffLens API")

@app.get("/health")
def health_check():
    return {"status": "ok", "environment": "local", "project": "DiffLens"}
