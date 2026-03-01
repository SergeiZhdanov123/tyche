"""
Secure API key generation and validation for Tyche Terminal.
Uses cryptographic random generation with SHA-256 hashing for storage.
"""

import secrets
import hashlib
import time
from typing import Tuple, Optional


# API Key format: tyche_xxxxxxxxxxxxxxxxxxxxxxxxxxxx (32 random chars)
KEY_PREFIX = "tyche_"
KEY_LENGTH = 32  # Random characters after prefix


def generate_api_key() -> Tuple[str, str]:
    """
    Generate a new API key with cryptographic randomness.
    
    Returns:
        Tuple of (raw_key, key_hash)
        - raw_key: The full API key to show user ONCE (tyche_xxx...)
        - key_hash: SHA-256 hash of the key for storage
    
    Security:
        - Uses secrets.token_urlsafe() for cryptographic randomness
        - Only the hash is stored in the database
        - Raw key is never logged or stored
    """
    # Generate cryptographically secure random string
    random_part = secrets.token_urlsafe(KEY_LENGTH)[:KEY_LENGTH]
    
    # Full key with prefix
    raw_key = f"{KEY_PREFIX}{random_part}"
    
    # Hash for storage (never store raw key)
    key_hash = hash_api_key(raw_key)
    
    return raw_key, key_hash


def hash_api_key(raw_key: str) -> str:
    """
    Hash an API key using SHA-256.
    
    Args:
        raw_key: The full API key string
        
    Returns:
        SHA-256 hex digest (64 characters)
    """
    return hashlib.sha256(raw_key.encode('utf-8')).hexdigest()


def get_key_prefix(raw_key: str) -> str:
    """
    Extract the prefix portion of an API key for identification.
    Shows the first 8 characters after 'tyche_'.
    
    Example: tyche_abc12345... -> abc12345
    """
    if raw_key.startswith(KEY_PREFIX):
        return raw_key[len(KEY_PREFIX):len(KEY_PREFIX) + 8]
    return raw_key[:8]


def validate_key_format(raw_key: str) -> bool:
    """
    Validate that an API key has the correct format.
    
    Args:
        raw_key: The API key to validate
        
    Returns:
        True if format is valid, False otherwise
    """
    if not raw_key:
        return False
    
    if not raw_key.startswith(KEY_PREFIX):
        return False
    
    random_part = raw_key[len(KEY_PREFIX):]
    
    if len(random_part) < 16:  # Minimum security
        return False
    
    return True


def mask_api_key(raw_key: str) -> str:
    """
    Mask an API key for display (show prefix + last 4 chars).
    
    Example: tyche_abc123xyz789 -> tyche_abc1...789
    """
    if not raw_key or len(raw_key) < 12:
        return "****"
    
    if raw_key.startswith(KEY_PREFIX):
        visible_start = raw_key[:len(KEY_PREFIX) + 4]
        visible_end = raw_key[-4:]
        return f"{visible_start}...{visible_end}"
    
    return f"{raw_key[:4]}...{raw_key[-4:]}"


# Rate limits by tier (requests per minute)
TIER_RATE_LIMITS = {
    "anonymous": 10,
    "starter": 30,
    "premium": 120,
    "enterprise": 600,
}


def get_rate_limit(tier: str) -> int:
    """
    Get the rate limit for a given tier.
    
    Args:
        tier: User tier (anonymous/starter/premium/enterprise)
        
    Returns:
        Requests per minute allowed
    """
    return TIER_RATE_LIMITS.get(tier, TIER_RATE_LIMITS["anonymous"])


# Tier features
TIER_FEATURES = {
    "starter": {
        "rate_limit": 30,
        "watchlist_size": 10,
        "api_calls_monthly": 1000,
        "historical_days": 30,
        "realtime_quotes": False,
        "ai_analysis": False,
    },
    "premium": {
        "rate_limit": 120,
        "watchlist_size": 50,
        "api_calls_monthly": 50000,
        "historical_days": 365,
        "realtime_quotes": True,
        "ai_analysis": True,
    },
    "enterprise": {
        "rate_limit": 600,
        "watchlist_size": 500,
        "api_calls_monthly": -1,  # Unlimited
        "historical_days": -1,  # Unlimited
        "realtime_quotes": True,
        "ai_analysis": True,
    },
}


def get_tier_features(tier: str) -> dict:
    """
    Get the feature set for a given tier.
    
    Args:
        tier: User tier name
        
    Returns:
        Dictionary of feature limits
    """
    return TIER_FEATURES.get(tier, TIER_FEATURES["starter"])
