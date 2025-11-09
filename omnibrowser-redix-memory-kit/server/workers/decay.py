import logging
import os
import time

from sqlalchemy import create_engine, text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("decay-worker")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://redix:redix@localhost:5432/redix")
DECAY_HOURS = int(os.getenv("DECAY_HOURS", "720"))  # default 30 days
SLEEP_SECONDS = int(os.getenv("DECAY_INTERVAL_SECONDS", "3600"))

engine = create_engine(DATABASE_URL, future=True)

DELETE_SQL = text(
    """
    DELETE FROM memories
    WHERE created_at < NOW() AT TIME ZONE 'UTC' - INTERVAL ':decay_hours hours'
      AND (acl->>'pinned')::boolean IS NOT TRUE
    """
)


def run() -> None:
    logger.info("Decay worker started. Interval=%ss, TTL=%sh", SLEEP_SECONDS, DECAY_HOURS)
    while True:
        try:
            with engine.begin() as conn:
                conn.execute(
                    text(
                        """
                        DELETE FROM memories
                        WHERE created_at < (NOW() AT TIME ZONE 'UTC') - (:ttl || ' hours')::INTERVAL
                          AND (acl->>'pinned')::boolean IS NOT TRUE
                        """
                    ),
                    {"ttl": DECAY_HOURS},
                )
            logger.info("Decay sweep completed.")
        except Exception as exc:  # pragma: no cover - worker resilience
            logger.exception("Decay sweep failed: %s", exc)
        time.sleep(SLEEP_SECONDS)


if __name__ == "__main__":
    run()

