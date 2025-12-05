#!/usr/bin/env python3
"""
Migration Script: Import .cursor file content into Postgres frontier
One-time script to migrate existing cursor state
"""

import os
import json
import sys
import psycopg2
from psycopg2.extras import RealDictCursor

DSN = os.getenv("REGEN_PG_DSN", "postgresql://regen:regen@localhost:5432/regen")
CURSOR_FILE = os.path.join(os.path.dirname(__file__), '..', '.cursor')


def migrate_cursor_file():
    """Read .cursor file and import URLs into frontier"""
    
    # Check if .cursor file exists
    if not os.path.exists(CURSOR_FILE):
        print(f"No .cursor file found at {CURSOR_FILE}")
        print("Nothing to migrate.")
        return 0
    
    # Read .cursor file
    try:
        with open(CURSOR_FILE, 'r') as f:
            cursor_data = json.load(f)
    except Exception as e:
        print(f"Error reading .cursor file: {e}")
        return 1
    
    # Connect to database
    try:
        conn = psycopg2.connect(DSN)
        cur = conn.cursor()
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return 1
    
    # Extract URLs from cursor data
    urls = []
    
    # Handle different cursor file formats
    if isinstance(cursor_data, dict):
        # Format 1: { "urls": [...], "visited": [...] }
        if 'urls' in cursor_data:
            urls.extend(cursor_data['urls'])
        if 'visited' in cursor_data:
            urls.extend(cursor_data['visited'])
        if 'queue' in cursor_data:
            urls.extend(cursor_data['queue'])
        
        # Format 2: { "frontier": [...] }
        if 'frontier' in cursor_data:
            for item in cursor_data['frontier']:
                if isinstance(item, str):
                    urls.append(item)
                elif isinstance(item, dict) and 'url' in item:
                    urls.append(item['url'])
    
    elif isinstance(cursor_data, list):
        # Format 3: ["url1", "url2", ...]
        urls = [url for url in cursor_data if isinstance(url, str)]
    
    if not urls:
        print("No URLs found in .cursor file")
        return 0
    
    print(f"Found {len(urls)} URLs in .cursor file")
    
    # Insert into frontier
    imported = 0
    for url in urls:
        try:
            cur.execute("""
                INSERT INTO frontier (url, score, state)
                VALUES (%s, 0, 'queued')
                ON CONFLICT (url) DO NOTHING
            """, (url,))
            if cur.rowcount > 0:
                imported += 1
        except Exception as e:
            print(f"Error importing URL {url}: {e}")
    
    conn.commit()
    cur.close()
    conn.close()
    
    print(f"Imported {imported} URLs into frontier")
    print(f"Skipped {len(urls) - imported} duplicates")
    
    return 0


if __name__ == '__main__':
    sys.exit(migrate_cursor_file())




