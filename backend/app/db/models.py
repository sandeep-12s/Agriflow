"""
SQLAlchemy models for every core AgriFlow table.

These mirror the schema in the project spec exactly (users, produce,
markets, market_prices, buyers, storage_facilities, processing_units,
recommendations, transactions) so later steps can build directly on
top of them without renaming fields.
"""
import enum
from datetime import datetime, date, timezone

from sqlalchemy import String, Float, ForeignKey, DateTime, Date, Enum, Text, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def utc_now() -> datetime:
    """Return a naive UTC timestamp for the existing database columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class UserRole(str, enum.Enum):
    farmer = "farmer"
    buyer = "buyer"
    admin = "admin"


class ProduceStatus(str, enum.Enum):
    available = "available"
    stored = "stored"
    processing = "processing"
    sold = "sold"


class TransactionStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(20), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.farmer)
    location: Mapped[str] = mapped_column(String(120))
    language: Mapped[str] = mapped_column(String(10), default="en")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    produce: Mapped[list["Produce"]] = relationship(back_populates="farmer")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="farmer")


class RegistrationOTP(Base):
    __tablename__ = "registration_otps"

    id: Mapped[int] = mapped_column(primary_key=True)
    phone: Mapped[str] = mapped_column(String(20), index=True)
    code_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class Produce(Base):
    __tablename__ = "produce"

    id: Mapped[int] = mapped_column(primary_key=True)
    farmer_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    crop_name: Mapped[str] = mapped_column(String(80), index=True)
    quantity: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(20), default="Quintal")
    quality: Mapped[str] = mapped_column(String(20), default="Grade A")
    harvest_date: Mapped[date] = mapped_column(Date)
    location: Mapped[str] = mapped_column(String(120))
    expected_sell_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[ProduceStatus] = mapped_column(Enum(ProduceStatus), default=ProduceStatus.available)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    farmer: Mapped["User"] = relationship(back_populates="produce")
    recommendations: Mapped[list["Recommendation"]] = relationship(back_populates="produce")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="produce")


class Market(Base):
    __tablename__ = "markets"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    location: Mapped[str] = mapped_column(String(120))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    # Demo distance for the hackathon UI — see seed.py. Real distance would
    # need the farmer's own coordinates, which the app doesn't collect yet.
    distance_km: Mapped[float] = mapped_column(Float, default=0.0)

    prices: Mapped[list["MarketPrice"]] = relationship(back_populates="market")


class MarketPrice(Base):
    __tablename__ = "market_prices"

    id: Mapped[int] = mapped_column(primary_key=True)
    market_id: Mapped[int] = mapped_column(ForeignKey("markets.id"))
    crop_name: Mapped[str] = mapped_column(String(80), index=True)
    price: Mapped[float] = mapped_column(Float)
    demand: Mapped[str] = mapped_column(String(20), default="Medium")
    date: Mapped[date] = mapped_column(Date, default=date.today)

    market: Mapped["Market"] = relationship(back_populates="prices")


class Buyer(Base):
    __tablename__ = "buyers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    product: Mapped[str] = mapped_column(String(80), index=True)
    required_quantity: Mapped[float] = mapped_column(Float)
    offered_price: Mapped[float] = mapped_column(Float)
    location: Mapped[str] = mapped_column(String(120))
    quality_requirement: Mapped[str] = mapped_column(String(20), default="Grade A")
    contact: Mapped[str] = mapped_column(String(80))

    transactions: Mapped[list["Transaction"]] = relationship(back_populates="buyer")


class StorageFacility(Base):
    __tablename__ = "storage_facilities"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    location: Mapped[str] = mapped_column(String(120))
    type: Mapped[str] = mapped_column(String(50))
    capacity: Mapped[float] = mapped_column(Float)
    available_capacity: Mapped[float] = mapped_column(Float)
    cost_per_unit: Mapped[float] = mapped_column(Float)
    supported_crops: Mapped[str] = mapped_column(String(255))  # comma-separated crop names
    # Demo distance, same approach as Market.distance_km and
    # ProcessingUnit.distance_km — see seed.py.
    distance_km: Mapped[float] = mapped_column(Float, default=0.0)


class ProcessingUnit(Base):
    __tablename__ = "processing_units"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    location: Mapped[str] = mapped_column(String(120))
    input_product: Mapped[str] = mapped_column(String(80), index=True)
    input_capacity: Mapped[float] = mapped_column(Float)
    processing_cost: Mapped[float] = mapped_column(Float)
    output_product: Mapped[str] = mapped_column(String(80))
    estimated_output: Mapped[float] = mapped_column(Float)  # output units per input unit
    # Demo distance, same approach as Market.distance_km — see seed.py.
    distance_km: Mapped[float] = mapped_column(Float, default=0.0)


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[int] = mapped_column(primary_key=True)
    produce_id: Mapped[int] = mapped_column(ForeignKey("produce.id"))
    option: Mapped[str] = mapped_column(String(30))  # SELL_NOW / STORE / PROCESS / ALT_BUYER
    expected_revenue: Mapped[float] = mapped_column(Float)
    total_cost: Mapped[float] = mapped_column(Float)
    expected_profit: Mapped[float] = mapped_column(Float)
    risk_score: Mapped[float] = mapped_column(Float)
    recommendation_score: Mapped[float] = mapped_column(Float)
    reason: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    produce: Mapped["Produce"] = relationship(back_populates="recommendations")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    farmer_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    buyer_id: Mapped[int | None] = mapped_column(ForeignKey("buyers.id"), nullable=True)
    produce_id: Mapped[int] = mapped_column(ForeignKey("produce.id"))
    quantity: Mapped[float] = mapped_column(Float)
    price: Mapped[float] = mapped_column(Float)
    status: Mapped[TransactionStatus] = mapped_column(Enum(TransactionStatus), default=TransactionStatus.pending)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    farmer: Mapped["User"] = relationship(back_populates="transactions")
    buyer: Mapped["Buyer"] = relationship(back_populates="transactions")
    produce: Mapped["Produce"] = relationship(back_populates="transactions")
