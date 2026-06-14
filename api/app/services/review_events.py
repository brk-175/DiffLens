import json
from redis import Redis
from redis.asyncio import Redis as AsyncRedis
from app.core.config import settings


def _channel(review_id: int) -> str:
    return f"reviews:{review_id}:events"


def publish_review_event(review_id: int, event: dict) -> None:
    client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        client.publish(_channel(review_id), json.dumps(event))
    finally:
        client.close()


async def subscribe_review_events(review_id: int):
    client = AsyncRedis.from_url(settings.REDIS_URL, decode_responses=True)
    pubsub = client.pubsub()
    await pubsub.subscribe(_channel(review_id))
    try:
        yield pubsub
    finally:
        await pubsub.unsubscribe(_channel(review_id))
        await pubsub.close()
        await client.close()
