#!/usr/bin/env python3
"""
Postgres Frontier Worker
Replaces file-based .cursor with durable Postgres frontier using SKIP LOCKED
"""

import os
import sys
import time
import json
import logging
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
from psycopg2.pool import ThreadedConnectionPool
from typing import List, Dict, Optional
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger('pg_worker')

# Database connection
DSN = os.getenv("REGEN_PG_DSN", "postgresql://regen:regen@localhost:5432/regen")
MAX_ATTEMPTS = int(os.getenv("FRONTIER_MAX_ATTEMPTS", "3"))
STALE_THRESHOLD_MINUTES = int(os.getenv("FRONTIER_STALE_THRESHOLD", "10"))
BATCH_SIZE = int(os.getenv("FRONTIER_BATCH_SIZE", "5"))
WORKER_ID = os.getenv("WORKER_ID", f"worker-{os.getpid()}-{int(time.time())}")

# Connection pool
pool: Optional[ThreadedConnectionPool] = None


def get_connection():
    """Get connection from pool"""
    global pool
    if pool is None:
        try:
            pool = ThreadedConnectionPool(1, 10, DSN)
            logger.info(f"Created connection pool for worker {WORKER_ID}")
        except Exception as e:
            logger.error(f"Failed to create connection pool: {e}")
            raise
    return pool.getconn()


def return_connection(conn):
    """Return connection to pool"""
    if pool:
        pool.putconn(conn)


def fetch_and_lock(batch_size: int = BATCH_SIZE) -> List[Dict]:
    """
    Fetch and lock frontier items using FOR UPDATE SKIP LOCKED
    This prevents multiple workers from processing the same item
    """
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Use FOR UPDATE SKIP LOCKED to safely claim items
            cur.execute("""
                UPDATE frontier
                SET 
                    state = 'in_progress',
                    last_attempt = now(),
                    attempt_count = attempt_count + 1,
                    worker_id = %s
                WHERE id IN (
                    SELECT id FROM frontier
                    WHERE state = 'queued'
                    AND attempt_count < %s
                    ORDER BY score DESC, id DESC
                    FOR UPDATE SKIP LOCKED
                    LIMIT %s
                )
                RETURNING *;
            """, (WORKER_ID, MAX_ATTEMPTS, batch_size))
            
            rows = cur.fetchall()
            conn.commit()
            
            if rows:
                logger.info(f"Claimed {len(rows)} items from frontier")
            return [dict(row) for row in rows]
    except Exception as e:
        conn.rollback()
        logger.error(f"Error fetching and locking items: {e}")
        raise
    finally:
        return_connection(conn)


def mark_done(item_id: int, metadata: Optional[Dict] = None):
    """Mark frontier item as done"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            update_data = {
                'state': 'done',
                'worker_id': None,
                'updated_at': datetime.now()
            }
            if metadata:
                update_data['metadata'] = json.dumps(metadata)
            
            cur.execute("""
                UPDATE frontier
                SET state = 'done', worker_id = NULL, updated_at = now()
                WHERE id = %s
            """, (item_id,))
            conn.commit()
            logger.debug(f"Marked item {item_id} as done")
    except Exception as e:
        conn.rollback()
        logger.error(f"Error marking item {item_id} as done: {e}")
        raise
    finally:
        return_connection(conn)


def mark_error(item_id: int, error_message: str):
    """Mark frontier item as error"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE frontier
                SET 
                    state = CASE 
                        WHEN attempt_count >= %s THEN 'error'
                        ELSE 'queued'
                    END,
                    error_message = %s,
                    worker_id = NULL,
                    updated_at = now()
                WHERE id = %s
            """, (MAX_ATTEMPTS, error_message, item_id))
            conn.commit()
            logger.warning(f"Marked item {item_id} as error: {error_message}")
    except Exception as e:
        conn.rollback()
        logger.error(f"Error marking item {item_id} as error: {e}")
        raise
    finally:
        return_connection(conn)


def requeue_stale_items():
    """
    Requeue items stuck in 'in_progress' state
    This is the watchdog function
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            threshold = datetime.now() - timedelta(minutes=STALE_THRESHOLD_MINUTES)
            cur.execute("""
                UPDATE frontier
                SET 
                    state = 'queued',
                    worker_id = NULL,
                    updated_at = now()
                WHERE state = 'in_progress'
                AND last_attempt < %s
                AND attempt_count < %s
            """, (threshold, MAX_ATTEMPTS))
            
            count = cur.rowcount
            conn.commit()
            
            if count > 0:
                logger.info(f"Requeued {count} stale items")
            return count
    except Exception as e:
        conn.rollback()
        logger.error(f"Error requeueing stale items: {e}")
        raise
    finally:
        return_connection(conn)


def add_urls(urls: List[str], score: float = 0.0, metadata: Optional[Dict] = None):
    """Add URLs to frontier (idempotent - ignores duplicates)"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Use ON CONFLICT DO NOTHING to handle duplicates
            values = [(url, score, json.dumps(metadata or {})) for url in urls]
            execute_values(
                cur,
                """
                INSERT INTO frontier (url, score, metadata, state)
                VALUES %s
                ON CONFLICT (url) DO NOTHING
                """,
                values
            )
            conn.commit()
            logger.info(f"Added {len(urls)} URLs to frontier")
    except Exception as e:
        conn.rollback()
        logger.error(f"Error adding URLs: {e}")
        raise
    finally:
        return_connection(conn)


def get_stats() -> Dict:
    """Get frontier statistics"""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    state,
                    COUNT(*) as count,
                    AVG(score) as avg_score,
                    MAX(attempt_count) as max_attempts
                FROM frontier
                GROUP BY state
            """)
            rows = cur.fetchall()
            return {row['state']: dict(row) for row in rows}
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        return {}
    finally:
        return_connection(conn)


def process_item(item: Dict) -> bool:
    """
    Process a single frontier item
    Override this in your worker implementation
    """
    logger.info(f"Processing item {item['id']}: {item['url']}")
    # TODO: Implement actual processing logic
    # For now, just mark as done
    time.sleep(0.1)  # Simulate work
    return True


def worker_loop():
    """Main worker loop"""
    logger.info(f"Starting worker {WORKER_ID}")
    
    # Requeue stale items on startup
    requeue_stale_items()
    
    while True:
        try:
            # Fetch and lock items
            items = fetch_and_lock(BATCH_SIZE)
            
            if not items:
                # No items available, wait before retrying
                time.sleep(5)
                continue
            
            # Process each item
            for item in items:
                try:
                    success = process_item(item)
                    if success:
                        mark_done(item['id'])
                    else:
                        mark_error(item['id'], "Processing failed")
                except Exception as e:
                    logger.error(f"Error processing item {item['id']}: {e}")
                    mark_error(item['id'], str(e))
            
            # Requeue stale items periodically
            requeue_stale_items()
            
        except KeyboardInterrupt:
            logger.info("Worker interrupted, shutting down")
            break
        except Exception as e:
            logger.error(f"Error in worker loop: {e}")
            time.sleep(5)  # Wait before retrying
    
    # Cleanup
    if pool:
        pool.closeall()
    logger.info("Worker stopped")


if __name__ == '__main__':
    # Check if running as watchdog
    if len(sys.argv) > 1 and sys.argv[1] == 'watchdog':
        logger.info("Running as watchdog (requeue stale items)")
        while True:
            try:
                requeue_stale_items()
                time.sleep(60)  # Run every minute
            except KeyboardInterrupt:
                break
    else:
        # Run as normal worker
        worker_loop()








