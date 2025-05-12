import json
import redis
from typing import Dict, Any, Optional, List
import logging

logger = logging.getLogger(__name__)

# Redis connection settings
REDIS_HOST = "localhost"
REDIS_PORT = 6379
REDIS_DB = 0
REDIS_PREFIX = "asikh_oms:"

# Create Redis client
try:
    redis_client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=REDIS_DB,
        decode_responses=True  # Automatically decode responses to Python strings
    )
    # Test connection
    redis_client.ping()
    logger.info("Connected to Redis successfully at %s:%s", REDIS_HOST, REDIS_PORT)
except redis.ConnectionError as e:
    logger.error(f"Failed to connect to Redis: {e}")
    # Fallback to a dummy client that logs operations but doesn't fail
    class DummyRedisClient:
        def __init__(self):
            self.data = {}
            logger.warning("Using in-memory fallback for Redis")
        
        def set(self, key, value, *args, **kwargs):
            logger.info(f"DummyRedis SET: {key}")
            self.data[key] = value
            return True
        
        def get(self, key):
            logger.info(f"DummyRedis GET: {key}")
            return self.data.get(key)
        
        def delete(self, key):
            logger.info(f"DummyRedis DEL: {key}")
            if key in self.data:
                del self.data[key]
            return True
        
        def exists(self, key):
            return key in self.data
        
        def hset(self, name, key, value):
            if name not in self.data:
                self.data[name] = {}
            self.data[name][key] = value
            return True
        
        def hget(self, name, key):
            if name in self.data and key in self.data[name]:
                return self.data[name][key]
            return None
        
        def hgetall(self, name):
            return self.data.get(name, {})
        
        def hdel(self, name, *keys):
            if name not in self.data:
                return 0
            count = 0
            for key in keys:
                if key in self.data[name]:
                    del self.data[name][key]
                    count += 1
            return count
        
        def hexists(self, name, key):
            return name in self.data and key in self.data[name]
    
    redis_client = DummyRedisClient()


class RedisManager:
    """
    Manager class for Redis operations with proper key prefixing and serialization
    """
    
    @staticmethod
    def _get_key(key: str) -> str:
        """Add prefix to Redis key"""
        return f"{REDIS_PREFIX}{key}"
    
    @staticmethod
    def set_json(key: str, data: Dict[str, Any], expiry: Optional[int] = None) -> bool:
        """
        Store JSON data in Redis
        
        Args:
            key: Redis key
            data: Dictionary to store
            expiry: Optional expiry time in seconds
            
        Returns:
            bool: Success status
        """
        try:
            prefixed_key = RedisManager._get_key(key)
            serialized = json.dumps(data)
            if expiry:
                return redis_client.set(prefixed_key, serialized, ex=expiry)
            else:
                return redis_client.set(prefixed_key, serialized)
        except Exception as e:
            logger.error(f"Redis set_json error: {e}")
            return False
    
    @staticmethod
    def get_json(key: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve JSON data from Redis
        
        Args:
            key: Redis key
            
        Returns:
            Optional[Dict]: Retrieved data or None if not found
        """
        try:
            prefixed_key = RedisManager._get_key(key)
            data = redis_client.get(prefixed_key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Redis get_json error: {e}")
            return None
    
    @staticmethod
    def delete(key: str) -> bool:
        """
        Delete a key from Redis
        
        Args:
            key: Redis key
            
        Returns:
            bool: Success status
        """
        try:
            prefixed_key = RedisManager._get_key(key)
            return redis_client.delete(prefixed_key) > 0
        except Exception as e:
            logger.error(f"Redis delete error: {e}")
            return False
    
    @staticmethod
    def exists(key: str) -> bool:
        """
        Check if a key exists in Redis
        
        Args:
            key: Redis key
            
        Returns:
            bool: True if key exists
        """
        try:
            prefixed_key = RedisManager._get_key(key)
            return redis_client.exists(prefixed_key) > 0
        except Exception as e:
            logger.error(f"Redis exists error: {e}")
            return False


# Specialized methods for batch reconciliation
class BatchReconciliationManager:
    """
    Specialized Redis manager for batch reconciliation operations
    """
    
    @staticmethod
    def get_batch_key(batch_id: str) -> str:
        """Get the Redis key for a batch"""
        return f"batch:{batch_id}"
    
    @staticmethod
    def get_crates_key(batch_id: str) -> str:
        """Get the Redis key for a batch's crates hash"""
        return f"batch:{batch_id}:crates"
    
    @staticmethod
    def init_batch_reconciliation(batch_id: str) -> bool:
        """
        Initialize batch reconciliation data in Redis
        
        Args:
            batch_id: Batch ID
            
        Returns:
            bool: Success status
        """
        batch_data = {
            "closed": False,
            "closed_at": None,
            "closed_by": None,
            "total_crates": 0,
            "reconciled_count": 0
        }
        return RedisManager.set_json(BatchReconciliationManager.get_batch_key(batch_id), batch_data)
    
    @staticmethod
    def get_reconciliation_status(batch_id: str) -> Dict[str, Any]:
        """
        Get reconciliation status for a batch
        
        Args:
            batch_id: Batch ID
            
        Returns:
            Dict: Reconciliation status data
        """
        # Get batch metadata
        batch_key = BatchReconciliationManager.get_batch_key(batch_id)
        logger.info(f"Getting reconciliation status for batch {batch_id}, key: {batch_key}")
        
        batch_data = RedisManager.get_json(batch_key)
        logger.info(f"Retrieved batch data from Redis: {batch_data}")
        
        if not batch_data:
            # Initialize if not exists
            logger.info(f"No batch data found in Redis for {batch_id}, initializing...")
            BatchReconciliationManager.init_batch_reconciliation(batch_id)
            batch_data = {
                "closed": False,
                "closed_at": None,
                "closed_by": None,
                "total_crates": 0,
                "reconciled_count": 0
            }
        
        # Get reconciled crates
        crates_key = BatchReconciliationManager.get_crates_key(batch_id)
        crates_data = {}
        
        try:
            # Get all crates data from hash
            prefixed_key = RedisManager._get_key(crates_key)
            logger.info(f"Getting reconciled crates from Redis hash: {prefixed_key}")
            redis_crates = redis_client.hgetall(prefixed_key)
            logger.info(f"Retrieved {len(redis_crates)} reconciled crates from Redis")
            
            for crate_id, crate_data in redis_crates.items():
                crates_data[crate_id] = json.loads(crate_data)
        except Exception as e:
            logger.error(f"Error getting reconciled crates: {e}")
        
        # Combine data
        result = {
            "batch_id": batch_id,
            "closed": batch_data.get("closed", False),
            "closed_at": batch_data.get("closed_at"),
            "closed_by": batch_data.get("closed_by"),
            "total_crates": batch_data.get("total_crates", 0),
            "reconciled_count": len(crates_data),  # Use actual count from Redis hash
            "crates": crates_data
        }
        
        logger.info(f"Returning reconciliation status: {result}")
        return result
    
    @staticmethod
    def reconcile_crate(batch_id: str, crate_id: str, user_id: str, timestamp: str, photo_url: str = None, weight: float = None) -> bool:
        """
        Mark a crate as reconciled
        
        Args:
            batch_id: Batch ID
            crate_id: Crate ID
            user_id: User ID who reconciled the crate
            timestamp: Timestamp of reconciliation
            
        Returns:
            bool: Success status
        """
        try:
            logger.info(f"Reconciling crate {crate_id} for batch {batch_id}")
            
            # Ensure batch exists
            batch_key = BatchReconciliationManager.get_batch_key(batch_id)
            if not RedisManager.exists(batch_key):
                logger.info(f"Batch {batch_id} not found in Redis, initializing...")
                BatchReconciliationManager.init_batch_reconciliation(batch_id)
            
            # Get current batch data
            batch_data = RedisManager.get_json(batch_key)
            logger.info(f"Current batch data: {batch_data}")
            
            # Add crate to reconciled crates
            crates_key = BatchReconciliationManager.get_crates_key(batch_id)
            crate_data = {
                "reconciled_by": user_id,
                "reconciled_at": timestamp,
            }
            
            # Add photo URL and weight if provided
            if photo_url:
                crate_data["photo_url"] = photo_url
                
            if weight is not None:
                crate_data["weight"] = weight
            
            # Store crate data in hash
            prefixed_key = RedisManager._get_key(crates_key)
            logger.info(f"Storing crate {crate_id} in Redis hash: {prefixed_key}")
            
            result = redis_client.hset(
                prefixed_key,
                crate_id,
                json.dumps(crate_data)
            )
            logger.info(f"Redis HSET result: {result}")
            
            # Get current count of reconciled crates
            all_crates = redis_client.hgetall(prefixed_key)
            reconciled_count = len(all_crates)
            logger.info(f"Current reconciled crates count: {reconciled_count}")
            
            # Update batch data with new count
            batch_data["reconciled_count"] = reconciled_count
            
            # Update batch data in Redis
            update_result = RedisManager.set_json(batch_key, batch_data)
            logger.info(f"Updated batch data in Redis: {update_result}")
            
            return True
        except Exception as e:
            logger.error(f"Error reconciling crate: {e}")
            return False
    
    @staticmethod
    def close_batch(batch_id: str, user_id: str, timestamp: str) -> bool:
        """
        Close a batch after reconciliation
        
        Args:
            batch_id: Batch ID
            user_id: User ID who closed the batch
            timestamp: Timestamp of closure
            
        Returns:
            bool: Success status
        """
        try:
            batch_key = BatchReconciliationManager.get_batch_key(batch_id)
            batch_data = RedisManager.get_json(batch_key)
            
            if not batch_data:
                return False
            
            batch_data["closed"] = True
            batch_data["closed_at"] = timestamp
            batch_data["closed_by"] = user_id
            
            return RedisManager.set_json(batch_key, batch_data)
        except Exception as e:
            logger.error(f"Error closing batch: {e}")
            return False
    
    @staticmethod
    def update_total_crates(batch_id: str, total_crates: int) -> bool:
        """Update total crates count for a batch
        
        Args:
            batch_id: Batch ID
            total_crates: Total number of crates in the batch
            
        Returns:
            bool: Success status
        """
        try:
            logger.info(f"Updating total crates for batch {batch_id} to {total_crates}")
            
            # Get batch key
            batch_key = BatchReconciliationManager.get_batch_key(batch_id)
            
            # Update batch data
            batch_data = RedisManager.get_json(batch_key) or {}
            batch_data["total_crates"] = total_crates
            
            # Save updated data
            result = RedisManager.set_json(batch_key, batch_data)
            
            return result
        except Exception as e:
            logger.error(f"Error updating total crates: {e}")
            return False
            
    @staticmethod
    def update_batch_status(batch_id: str, can_close: bool = False, closed: bool = False, closed_at: str = None, closed_by: str = None) -> bool:
        """Update batch status in Redis
        
        Args:
            batch_id: Batch ID
            can_close: Whether the batch can be closed
            closed: Whether the batch is closed
            closed_at: Timestamp when the batch was closed
            closed_by: User ID who closed the batch
            
        Returns:
            bool: Success status
        """
        try:
            logger.info(f"Updating batch status for {batch_id}: can_close={can_close}, closed={closed}")
            
            # Get batch key
            batch_key = BatchReconciliationManager.get_batch_key(batch_id)
            
            # Update batch data
            batch_data = RedisManager.get_json(batch_key) or {}
            
            if can_close:
                batch_data["can_close"] = True
                
            if closed:
                batch_data["closed"] = True
                batch_data["closed_at"] = closed_at
                batch_data["closed_by"] = closed_by
            
            # Save updated data
            result = RedisManager.set_json(batch_key, batch_data)
            
            return result
        except Exception as e:
            logger.error(f"Error updating batch status: {e}")
            return False
