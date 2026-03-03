"""
SQLAlchemy models for Erns API.
Includes API key management and user tier tracking.
"""

from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from db import Base
import datetime


class APIKey(Base):
    """
    API key storage with hashed keys and tier-based rate limiting.
    
    Fields:
        key_hash: SHA-256 hash of the API key (never store plain keys)
        plan: User subscription tier (starter/premium/enterprise)
        owner_email: Email of the key owner
        created_at: Unix timestamp of creation
        is_active: Whether the key is currently active
        last_used_at: Last API call timestamp
        total_requests: Lifetime request count
        name: Optional friendly name for the key
    """
    __tablename__ = "api_keys"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    key_hash = Column(String(64), unique=True, nullable=False, index=True)
    key_prefix = Column(String(8), nullable=False)  # First 8 chars for identification
    plan = Column(String(20), nullable=False, default="starter")
    owner_email = Column(String(255), nullable=False, index=True)
    created_at = Column(Integer, nullable=False)  # Unix timestamp
    is_active = Column(Integer, nullable=False, default=1)  # 1=active, 0=revoked
    last_used_at = Column(Integer, nullable=True)
    total_requests = Column(Integer, nullable=False, default=0)
    name = Column(String(100), nullable=True)  # User-friendly name like "Production Key"
    
    def __repr__(self):
        return f"<APIKey {self.key_prefix}... ({self.plan})>"


class APIKeyUsage(Base):
    """
    Daily usage tracking for API keys.
    Used for analytics and quota enforcement.
    """
    __tablename__ = "api_key_usage"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    key_hash = Column(String(64), ForeignKey("api_keys.key_hash"), nullable=False, index=True)
    date = Column(String(10), nullable=False)  # YYYY-MM-DD
    endpoint = Column(String(100), nullable=False)
    request_count = Column(Integer, nullable=False, default=0)
    
    # Composite index for efficient lookups
    __table_args__ = (
        # Index for key+date lookups
    )


class UserWatchlist(Base):
    """
    User's stock watchlist for the dashboard.
    """
    __tablename__ = "user_watchlists"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_email = Column(String(255), nullable=False, index=True)
    ticker = Column(String(10), nullable=False)
    added_at = Column(Integer, nullable=False)  # Unix timestamp
    notes = Column(Text, nullable=True)
    
    def __repr__(self):
        return f"<Watchlist {self.user_email}: {self.ticker}>"


class TrackedTicker(Base):
    """
    Tickers being actively tracked for SEC data refresh.
    """
    __tablename__ = "tracked_tickers"
    
    ticker = Column(String, primary_key=True)
    cik10 = Column(String, nullable=False)
    updated_at = Column(Integer, nullable=False)


class CachedJSON(Base):
    """
    Generic JSON cache for SEC API responses.
    """
    __tablename__ = "cached_json"
    
    key = Column(String(255), primary_key=True)  # e.g., "facts:0000320193"
    updated_at = Column(Integer, nullable=False)  # Unix timestamp
    payload = Column(Text, nullable=False)  # JSON string


class EarningsCache(Base):
    """
    Cached earnings calendar data from web scraping.
    """
    __tablename__ = "earnings_cache"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String(10), nullable=False, index=True)
    earnings_date = Column(String(10), nullable=False)  # YYYY-MM-DD
    earnings_time = Column(String(10), nullable=True)  # BMO/AMC
    eps_estimate = Column(String(20), nullable=True)
    revenue_estimate = Column(String(50), nullable=True)
    source = Column(String(50), nullable=False)  # yahoo/marketwatch/nasdaq
    scraped_at = Column(Integer, nullable=False)  # Unix timestamp
    
    def __repr__(self):
        return f"<EarningsCache {self.ticker} @ {self.earnings_date}>"

