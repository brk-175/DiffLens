from redis import Redis
from rq import Queue
from app.core.config import settings


def get_reviews_queue() -> Queue:
    redis_conn = Redis.from_url(
        settings.REDIS_URL,
        socket_timeout=120,
        socket_connect_timeout=60,
        socket_keepalive=True,
        retry_on_timeout=True
    )
    return Queue("reviews-queue", connection=redis_conn)
