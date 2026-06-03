import hashlib
import json
from botocore.client import Config
import boto3
from app.core.config import settings


class StorageService:
    def __init__(self) -> None:
        protocol = "https" if settings.MINIO_SECURE else "http"
        endpoint = f"{protocol}://{settings.MINIO_ENDPOINT}"

        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
            config=Config(signature_version="s3v4"),
            region_name="us-east-1",
        )

    def ensure_bucket(self) -> None:
        buckets = [b["Name"] for b in self.client.list_buckets().get("Buckets", [])]
        if settings.MINIO_BUCKET not in buckets:
            self.client.create_bucket(Bucket=settings.MINIO_BUCKET)

    def put_object(self, key: str, data: bytes, content_type: str) -> tuple[str, int, str]:
        self.ensure_bucket()
        self.client.put_object(
            Bucket=settings.MINIO_BUCKET,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
        checksum = hashlib.sha256(data).hexdigest()
        return key, len(data), checksum

    def get_object(self, key: str) -> bytes | None:
        obj = self.client.get_object(Bucket=settings.MINIO_BUCKET, Key=key)
        try:
            return obj["Body"].read()
        finally:
            obj["Body"].close()

    def upload_text(self, key: str, content: str) -> tuple[str, int, str]:
        return self.put_object(key, content.encode("utf-8"), "text/plain")

    def upload_json(self, key: str, payload: dict) -> tuple[str, int, str]:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        return self.put_object(key, data, "application/json")

    def download_text(self, object_path: str) -> str:
        response = self.get_object(object_path)
        return response.decode("utf-8")
