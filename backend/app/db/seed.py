"""
Seeds the database with demo markets, prices, buyers, storage facilities,
and processing units.

***All figures in this file are fabricated for hackathon demonstration.***
None of it is live mandi pricing or a verified data feed — the UI must
always label it as demo/estimated data, never as real-time.

Each crop gets TWO price rows per market — one dated today ("current")
and one dated a week ago ("previous") — so the Market module (Step 6)
can compute a real price change and trend arrow instead of faking one.

Run with (from the backend/ folder):
    python -m app.db.seed
"""
from datetime import date, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.db.database import SessionLocal, init_db
from app.db.models import Market, MarketPrice, Buyer, StorageFacility, ProcessingUnit

ONE_WEEK_AGO = date.today() - timedelta(days=7)


def seed(db: Optional[Session] = None) -> None:
    """
    Seeds demo data into `db` if given (e.g. an isolated test database —
    see tests/conftest.py), otherwise creates its own session against the
    real app database, same as running this file directly.
    """
    owns_session = db is None
    if owns_session:
        init_db()
        db = SessionLocal()
    try:
        if db.query(Market).first():
            print("Demo data already present — skipping. Delete agriflow.db to reseed from scratch.")
            return

        # --- Markets (distance_km is a flat demo figure, not computed from
        # any real farmer location) ---
        markets = [
            Market(name="Market A (Local Mandi)", location="Uttar Pradesh",
                   latitude=28.35, longitude=79.42, distance_km=15),
            Market(name="Market B (District Hub)", location="Uttar Pradesh",
                   latitude=28.60, longitude=79.75, distance_km=40),
            Market(name="Market C (Wholesale)", location="Uttar Pradesh",
                   latitude=28.20, longitude=79.10, distance_km=8),
        ]
        db.add_all(markets)
        db.flush()  # assigns each market an id without committing yet

        # --- Prices: crop -> [(current, previous) per market, in market order] ---
        price_table = {
            "Tomato": [(2200, 2100), (2450, 2500), (2100, 2150)],
            "Potato": [(1200, 1150), (1350, 1300), (1150, 1200)],
            "Mango": [(4000, 3800), (4300, 4300), (3800, 3900)],
            "Wheat": [(2100, 2080), (2150, 2130), (2080, 2090)],
            "Rice": [(1900, 1850), (2000, 1980), (1850, 1870)],
            "Onion": [(1600, 1700), (1750, 1800), (1500, 1550)],
            "Milk": [(3400, 3380), (3450, 3440), (3300, 3310)],  # ₹ per 100 L, demo unit
        }
        demand_by_market = ["High", "Medium", "Low"]
        price_rows = 0
        for crop, per_market in price_table.items():
            for market, (current_price, previous_price), demand in zip(
                markets, per_market, demand_by_market
            ):
                db.add(MarketPrice(
                    market_id=market.id, crop_name=crop, price=current_price,
                    demand=demand, date=date.today(),
                ))
                db.add(MarketPrice(
                    market_id=market.id, crop_name=crop, price=previous_price,
                    demand=demand, date=ONE_WEEK_AGO,
                ))
                price_rows += 2

        # --- Buyers ---
        buyers = [
            Buyer(name="FreshFoods Pvt Ltd", product="Tomato", required_quantity=20,
                  offered_price=2400, location="Bareilly, UP", latitude=28.367, longitude=79.430,
                  quality_requirement="Grade A", contact="demo-buyer-1@example.com"),
            Buyer(name="AgroMart Wholesale", product="Potato", required_quantity=50,
                  offered_price=1300, location="Pilibhit, UP", latitude=28.631, longitude=79.803,
                  quality_requirement="Grade B", contact="demo-buyer-2@example.com"),
            Buyer(name="Golden Harvest Exports", product="Mango", required_quantity=15,
                  offered_price=4200, location="Shahjahanpur, UP", latitude=27.880, longitude=79.910,
                  quality_requirement="Grade A", contact="demo-buyer-3@example.com"),
        ]
        db.add_all(buyers)

        # --- Storage facilities ---
        storage = [
            StorageFacility(name="ColdChain Storage Hub", location="Bareilly, UP", type="Cold Storage",
                            capacity=1000, available_capacity=400, cost_per_unit=15,
                            supported_crops="Tomato,Potato,Mango,Milk", distance_km=10,
                            latitude=28.375, longitude=79.415),
            StorageFacility(name="Community Grain Warehouse", location="Pilibhit, UP", type="Dry Warehouse",
                            capacity=5000, available_capacity=2200, cost_per_unit=5,
                            supported_crops="Wheat,Rice,Onion", distance_km=45,
                            latitude=28.620, longitude=79.795),
        ]
        db.add_all(storage)

        # --- Processing units ---
        processing = [
            ProcessingUnit(
                name="Sunrise Tomato Processing Co.", location="Bareilly, UP",
                latitude=28.347, longitude=79.420,
                input_product="Tomato", input_capacity=50, processing_cost=300,
                output_product="Tomato Puree", estimated_output=0.35, distance_km=12,
                contact_email="orders@sunrisetomato.in", contact_phone="+91-9870012345",
                description="State-of-the-art tomato processing facility with cold-chain handling. "
                            "Certified by FSSAI. Accepts contract farming produce. Payment within 7 days. "
                            "Capacity: 50 MT/day. Produces puree, ketchup concentrate and canned tomatoes.",
            ),
            ProcessingUnit(
                name="Ganges Mango Co. Pvt Ltd", location="Shahjahanpur, UP",
                latitude=27.883, longitude=79.908,
                input_product="Mango", input_capacity=30, processing_cost=450,
                output_product="Mango Pulp", estimated_output=0.6, distance_km=35,
                contact_email="procurement@gangesmango.com", contact_phone="+91-9455098765",
                description="Leading Alphonso & Dasheri mango pulp exporter with 15+ years experience. "
                            "ISO 22000:2018 certified. Exports to UAE, UK, USA. Handles Safeda, Dashehari & Langra varieties. "
                            "Minimum intake: 5 MT per lot. Free farm pick-up above 10 MT.",
            ),
            ProcessingUnit(
                name="Local Dairy Cooperative (LDCC)", location="Bareilly, UP",
                latitude=28.363, longitude=79.398,
                input_product="Milk", input_capacity=200, processing_cost=200,
                output_product="Paneer", estimated_output=0.2, distance_km=10,
                contact_email="milk@ldcc-bareilly.coop", contact_phone="+91-5812-245678",
                description="Farmer-owned cooperative with 3,200 member households. "
                            "Processes milk into paneer, ghee, curd and butter. "
                            "Daily collection route covers 40 km radius. "
                            "Guaranteed minimum price above MSP. NDDB affiliated.",
            ),
        ]
        db.add_all(processing)

        db.commit()
        print(
            f"Seeded {len(markets)} markets, {price_rows} price rows, "
            f"{len(buyers)} buyers, {len(storage)} storage facilities, "
            f"{len(processing)} processing units."
        )
    finally:
        if owns_session:
            db.close()


if __name__ == "__main__":
    seed()
