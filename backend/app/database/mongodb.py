"""
MongoDB Database Connection & Collection Manager
Supports local MongoDB and MongoDB Atlas with connection fallback.
"""

from pymongo import MongoClient
from backend.app.core.config import settings

class MongoDB:
    client: MongoClient = None
    db = None

db_instance = MongoDB()

def get_database():
    if db_instance.db is None:
        try:
            db_instance.client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2000)
            db_instance.db = db_instance.client[settings.DATABASE_NAME]
            # Ensure indexes
            db_instance.db.users.create_index("email", unique=True)
            db_instance.db.portfolios.create_index("user_id")
            db_instance.db.watchlists.create_index("user_id")
            db_instance.db.predictions.create_index("ticker")
        except Exception as e:
            # Non-blocking graceful fallback
            print(f"[MongoDB Warning] Connection error: {e}. Operating in memory-cache mode.")
            db_instance.db = None
    return db_instance.db
