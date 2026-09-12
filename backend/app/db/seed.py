"""
Seeds the database with verified demo markets, prices, buyers, storage facilities,
and processing units across all major agricultural regions in India.

***All figures in this file are fabricated for hackathon demonstration.***
None of it is live mandi pricing or a verified data feed — the UI must
always label it as demo/estimated data, never as real-time.

Run with (from the backend/ folder):
    python -m app.db.seed
"""
from datetime import date, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.db.database import SessionLocal, init_db
from app.db.models import Market, MarketPrice, Buyer, StorageFacility, ProcessingUnit

ONE_WEEK_AGO = date.today() - timedelta(days=7)


def seed_markets_and_prices(db: Session) -> None:
    if db.query(Market).first():
        return

    markets = [
        Market(name="Market A (Local Mandi)", location="Uttar Pradesh", latitude=28.35, longitude=79.42, distance_km=15),
        Market(name="Market B (District Hub)", location="Uttar Pradesh", latitude=28.60, longitude=79.75, distance_km=40),
        Market(name="Market C (Wholesale)", location="Uttar Pradesh", latitude=28.20, longitude=79.10, distance_km=8),
    ]
    db.add_all(markets)
    db.flush()

    price_table = {
        "Tomato": [(2200, 2100), (2450, 2500), (2100, 2150)],
        "Potato": [(1200, 1150), (1350, 1300), (1150, 1200)],
        "Mango": [(4000, 3800), (4300, 4300), (3800, 3900)],
        "Wheat": [(2100, 2080), (2150, 2130), (2080, 2090)],
        "Rice": [(1900, 1850), (2000, 1980), (1850, 1870)],
        "Onion": [(1600, 1700), (1750, 1800), (1500, 1550)],
        "Milk": [(3400, 3380), (3450, 3440), (3300, 3310)],
    }
    demand_by_market = ["High", "Medium", "Low"]

    for crop, per_market in price_table.items():
        for idx, market in enumerate(markets):
            curr_p, prev_p = per_market[idx % len(per_market)]
            demand = demand_by_market[idx % len(demand_by_market)]
            db.add(MarketPrice(market_id=market.id, crop_name=crop, price=curr_p, demand=demand, date=date.today()))
            db.add(MarketPrice(market_id=market.id, crop_name=crop, price=prev_p, demand=demand, date=ONE_WEEK_AGO))


def seed_buyers(db: Session) -> None:
    if db.query(Buyer).first():
        return

    buyers = [
        # Maharashtra (Nashik, Pune, Nagpur)
        Buyer(name="Sahyadri Farmers Producer Co", product="Tomato", required_quantity=45,
              offered_price=2550, location="Nashik, Maharashtra", latitude=19.997, longitude=73.789,
              quality_requirement="Grade A", contact="+91-9822012345"),
        Buyer(name="Pimpalgaon Onion Traders", product="Onion", required_quantity=80,
              offered_price=2200, location="Nashik, Maharashtra", latitude=20.170, longitude=73.980,
              quality_requirement="Medium to Large", contact="+91-9823054321"),
        Buyer(name="Baramati Agro Foods", product="Potato", required_quantity=60,
              offered_price=1450, location="Pune, Maharashtra", latitude=18.520, longitude=73.856,
              quality_requirement="Grade B+", contact="+91-9822987654"),
        Buyer(name="Vidarbha Soybean & Cotton Consortium", product="Soybean", required_quantity=100,
              offered_price=4600, location="Nagpur, Maharashtra", latitude=21.145, longitude=79.088,
              quality_requirement="FAQ Quality", contact="+91-9422112233"),

        # Punjab & Haryana (Ludhiana, Jalandhar, Karnal)
        Buyer(name="Doaba Basmati Rice Millers", product="Paddy", required_quantity=150,
              offered_price=3750, location="Jalandhar, Punjab", latitude=31.326, longitude=75.576,
              quality_requirement="Pusa 1509/1121", contact="+91-9814011223"),
        Buyer(name="Khanna Grain & Agro Terminal", product="Basmati Rice", required_quantity=200,
              offered_price=3850, location="Ludhiana, Punjab", latitude=30.901, longitude=75.857,
              quality_requirement="Sharbati / 1121", contact="+91-9815044556"),
        Buyer(name="Karnal Mustard Oil Industries", product="Mustard", required_quantity=70,
              offered_price=5650, location="Karnal, Haryana", latitude=29.685, longitude=76.990,
              quality_requirement="High Oil Content", contact="+91-9896077889"),

        # Gujarat (Rajkot, Anand, Surat)
        Buyer(name="Saurashtra Groundnut & Cotton Traders", product="Cotton", required_quantity=80,
              offered_price=7400, location="Rajkot, Gujarat", latitude=22.303, longitude=70.802,
              quality_requirement="Long Staple", contact="+91-9825033445"),
        Buyer(name="Amul Organic Procurement", product="Milk", required_quantity=500,
              offered_price=3600, location="Anand, Gujarat", latitude=22.564, longitude=72.928,
              quality_requirement="Fat 4.5% SNF 8.5%", contact="+91-2692-225500"),
        Buyer(name="Surat Fresh Agro Hub", product="Tomato", required_quantity=35,
              offered_price=2480, location="Surat, Gujarat", latitude=21.170, longitude=72.831,
              quality_requirement="Grade A", contact="+91-9824099887"),

        # Uttar Pradesh (Bareilly, Agra, Lucknow)
        Buyer(name="FreshFoods Pvt Ltd", product="Tomato", required_quantity=30,
              offered_price=2400, location="Bareilly, Uttar Pradesh", latitude=28.367, longitude=79.430,
              quality_requirement="Grade A", contact="+91-9412011223"),
        Buyer(name="AgroMart Wholesale Potato Hub", product="Potato", required_quantity=80,
              offered_price=1380, location="Pilibhit, Uttar Pradesh", latitude=28.631, longitude=79.803,
              quality_requirement="Kufri Bahar", contact="+91-9412099887"),
        Buyer(name="Awadh Mango & Fruit Exports", product="Mango", required_quantity=25,
              offered_price=4350, location="Shahjahanpur, Uttar Pradesh", latitude=27.880, longitude=79.910,
              quality_requirement="Export Grade", contact="+91-9415055443"),
        Buyer(name="Lucknow Flour Mills Pvt Ltd", product="Barley", required_quantity=120,
              offered_price=1980, location="Lucknow, Uttar Pradesh", latitude=26.846, longitude=80.946,
              quality_requirement="Grade A Grain", contact="+91-9450012345"),

        # South India (Karnataka, Tamil Nadu, Andhra Pradesh, Kerala)
        Buyer(name="Bangalore Vegetable & Retail Chain", product="Tomato", required_quantity=50,
              offered_price=2600, location="Bengaluru, Karnataka", latitude=12.971, longitude=77.594,
              quality_requirement="Grade A Salad", contact="+91-9845012345"),
        Buyer(name="Guntur Spices & Chilli Consortium", product="Chilli", required_quantity=40,
              offered_price=18500, location="Guntur, Andhra Pradesh", latitude=16.306, longitude=80.436,
              quality_requirement="Teja / S10", contact="+91-9848033221"),
        Buyer(name="Kongu Agro Mills", product="Paddy", required_quantity=90,
              offered_price=2350, location="Coimbatore, Tamil Nadu", latitude=11.016, longitude=76.955,
              quality_requirement="Ponni Raw Rice", contact="+91-9842077665"),
        Buyer(name="Cochin Spices & Plantations Trade", product="Black Pepper", required_quantity=20,
              offered_price=48000, location="Kochi, Kerala", latitude=9.931, longitude=76.267,
              quality_requirement="Malabar Garbled", contact="+91-9847044556"),

        # East & Central (West Bengal, Bihar, MP)
        Buyer(name="Burdwan Golden Rice Millers", product="Paddy", required_quantity=110,
              offered_price=2280, location="Bardhaman, West Bengal", latitude=23.232, longitude=87.861,
              quality_requirement="Swarna / Minikit", contact="+91-9831088776"),
        Buyer(name="Mithila Makhana & Maize Traders", product="Maize", required_quantity=85,
              offered_price=2250, location="Darbhanga, Bihar", latitude=26.154, longitude=85.891,
              quality_requirement="Moisture < 12%", contact="+91-9934022334"),
        Buyer(name="Malwa Soya Processing Merchants", product="Soybean", required_quantity=130,
              offered_price=4580, location="Indore, Madhya Pradesh", latitude=22.719, longitude=75.857,
              quality_requirement="Yellow Cleaned", contact="+91-9826011998"),
    ]
    db.add_all(buyers)


def seed_storage(db: Session) -> None:
    if db.query(StorageFacility).first():
        return

    storage = [
        # Maharashtra
        StorageFacility(name="Nashik Multi-Chamber Onion Cold Store", location="Nashik, Maharashtra", type="Cold Storage",
                        capacity=2500, available_capacity=950, cost_per_unit=12,
                        supported_crops="Onion,Tomato,Grapes,Pomegranate", distance_km=8,
                        latitude=20.015, longitude=73.810),
        StorageFacility(name="Sahyadri Agri Cold Chain Logistics", location="Pune, Maharashtra", type="Controlled Atmosphere",
                        capacity=4000, available_capacity=1800, cost_per_unit=16,
                        supported_crops="Tomato,Potato,Mango,Pomegranate", distance_km=14,
                        latitude=18.530, longitude=73.865),
        StorageFacility(name="Vidarbha Central Warehouse", location="Nagpur, Maharashtra", type="Dry Warehouse",
                        capacity=8000, available_capacity=3400, cost_per_unit=6,
                        supported_crops="Soybean,Cotton,Wheat,Gram", distance_km=12,
                        latitude=21.150, longitude=79.090),

        # Punjab & Haryana
        StorageFacility(name="Markfed Automated Grain Silo", location="Ludhiana, Punjab", type="Dry Silo",
                        capacity=10000, available_capacity=4200, cost_per_unit=5,
                        supported_crops="Wheat,Paddy,Maize", distance_km=10,
                        latitude=30.910, longitude=75.860),
        StorageFacility(name="Jalandhar Agro Cold Terminal", location="Jalandhar, Punjab", type="Cold Storage",
                        capacity=3000, available_capacity=1100, cost_per_unit=14,
                        supported_crops="Potato,Tomato,Peas", distance_km=16,
                        latitude=31.330, longitude=75.580),

        # Gujarat
        StorageFacility(name="Rajkot Agro Refrigerated Storage", location="Rajkot, Gujarat", type="Cold Storage",
                        capacity=3500, available_capacity=1250, cost_per_unit=13,
                        supported_crops="Groundnut,Potato,Tomato,Onion", distance_km=11,
                        latitude=22.310, longitude=70.810),
        StorageFacility(name="Amul Cold Chain & Warehouse Hub", location="Anand, Gujarat", type="Cold Storage",
                        capacity=5000, available_capacity=2200, cost_per_unit=15,
                        supported_crops="Milk,Potato,Tomato,Mango", distance_km=9,
                        latitude=22.570, longitude=72.930),

        # Uttar Pradesh
        StorageFacility(name="ColdChain Storage Hub", location="Bareilly, Uttar Pradesh", type="Cold Storage",
                        capacity=1500, available_capacity=600, cost_per_unit=15,
                        supported_crops="Tomato,Potato,Mango,Milk", distance_km=10,
                        latitude=28.375, longitude=79.415),
        StorageFacility(name="Community Grain Warehouse", location="Pilibhit, Uttar Pradesh", type="Dry Warehouse",
                        capacity=5000, available_capacity=2200, cost_per_unit=5,
                        supported_crops="Wheat,Rice,Onion,Mustard", distance_km=25,
                        latitude=28.620, longitude=79.795),
        StorageFacility(name="Agra Central Potato Cold Vault", location="Agra, Uttar Pradesh", type="Cold Storage",
                        capacity=6000, available_capacity=2500, cost_per_unit=11,
                        supported_crops="Potato,Onion", distance_km=18,
                        latitude=27.176, longitude=78.008),

        # South India
        StorageFacility(name="Kolar & Bangalore Agri Cold Hub", location="Bengaluru, Karnataka", type="Cold Storage",
                        capacity=4500, available_capacity=1900, cost_per_unit=15,
                        supported_crops="Tomato,Mango,Vegetables", distance_km=15,
                        latitude=12.980, longitude=77.600),
        StorageFacility(name="Guntur Chilli & Spices Cold Storage", location="Guntur, Andhra Pradesh", type="Cold Storage",
                        capacity=7000, available_capacity=3100, cost_per_unit=14,
                        supported_crops="Chilli,Spices,Turmeric", distance_km=12,
                        latitude=16.315, longitude=80.445),
        StorageFacility(name="Cochin Spices & Deep Freeze Vault", location="Kochi, Kerala", type="Cold Storage",
                        capacity=2000, available_capacity=800, cost_per_unit=18,
                        supported_crops="Black Pepper,Spices,Ginger,Cardamom", distance_km=10,
                        latitude=9.940, longitude=76.275),

        # East & Central
        StorageFacility(name="Malda Mango & Potato Cold Storage", location="Malda, West Bengal", type="Cold Storage",
                        capacity=3800, available_capacity=1400, cost_per_unit=13,
                        supported_crops="Mango,Potato,Tomato", distance_km=20,
                        latitude=25.010, longitude=88.140),
        StorageFacility(name="Indore Soya & Grain Warehouse", location="Indore, Madhya Pradesh", type="Dry Warehouse",
                        capacity=9000, available_capacity=4100, cost_per_unit=6,
                        supported_crops="Soybean,Wheat,Gram,Garlic", distance_km=14,
                        latitude=22.725, longitude=75.865),
    ]
    db.add_all(storage)


def seed_processing(db: Session) -> None:
    if db.query(ProcessingUnit).first():
        return

    processing = [
        # Maharashtra
        ProcessingUnit(
            name="Sahyadri Dehydration & Puree Plant", location="Nashik, Maharashtra",
            latitude=20.020, longitude=73.820,
            input_product="Tomato", input_capacity=80, processing_cost=290,
            output_product="Tomato Puree", estimated_output=0.35, distance_km=12,
            contact_email="procure@sahyadriagro.in", contact_phone="+91-9822099887",
            description="ISO 22000 & HACCP certified mega food park processing plant. "
                        "Processes tomato puree, paste and pasteurized sauce. "
                        "Accepts farm lots from 5 to 50 MT with prompt 5-day bank settlement.",
        ),
        ProcessingUnit(
            name="Godavari Onion Dehydration Works", location="Nashik, Maharashtra",
            latitude=19.980, longitude=73.770,
            input_product="Onion", input_capacity=100, processing_cost=320,
            output_product="Onion Flakes", estimated_output=0.25, distance_km=15,
            contact_email="plant@godavaridehydration.com", contact_phone="+91-9823011223",
            description="Premier onion dehydrator producing white, pink and red onion flakes/powder for export. "
                        "State-of-the-art continuous dryer. Minimum intake: 3 MT.",
        ),
        ProcessingUnit(
            name="Baramati Dairy & Agro Products", location="Pune, Maharashtra",
            latitude=18.510, longitude=73.840,
            input_product="Milk", input_capacity=300, processing_cost=180,
            output_product="Paneer", estimated_output=0.20, distance_km=22,
            contact_email="orders@baramatidairy.org", contact_phone="+91-9822556677",
            description="Modern cooperative processing dairy unit with daily refrigerated collection. "
                        "NDDB affiliated. Produces paneer, butter, ghee and sterilized cream.",
        ),

        # Punjab & Haryana
        ProcessingUnit(
            name="Punjab Agro Juices & Pulp Ltd", location="Ludhiana, Punjab",
            latitude=30.895, longitude=75.845,
            input_product="Mango", input_capacity=60, processing_cost=420,
            output_product="Mango Pulp", estimated_output=0.55, distance_km=18,
            contact_email="procurement@punjabagrojuice.com", contact_phone="+91-9814088990",
            description="Government-backed modern agro processing plant with aseptic packaging line. "
                        "Processes mango pulp, citrus concentrate and tomato puree.",
        ),
        ProcessingUnit(
            name="Sutlej Grain Milling & Agro Works", location="Ludhiana, Punjab",
            latitude=30.920, longitude=75.870,
            input_product="Barley", input_capacity=150, processing_cost=140,
            output_product="Barley Malt", estimated_output=0.88, distance_km=14,
            contact_email="info@sutlejmill.in", contact_phone="+91-9815077665",
            description="High capacity roller mill producing premium barley malt and flour. "
                        "Direct procurement from farmers above APMC rate for quality grain.",
        ),

        # Gujarat
        ProcessingUnit(
            name="Saurashtra Dehydration & Food Co", location="Rajkot, Gujarat",
            latitude=22.320, longitude=70.820,
            input_product="Onion", input_capacity=75, processing_cost=310,
            output_product="Onion Flakes", estimated_output=0.25, distance_km=16,
            contact_email="contact@saurashtradehydration.in", contact_phone="+91-9825012345",
            description="Export oriented unit for dehydrated vegetables, toasted onion flakes and garlic powder. "
                        "APEDA registered and USFDA compliant.",
        ),
        ProcessingUnit(
            name="Gujarat Cooperative Dairy Union", location="Anand, Gujarat",
            latitude=22.560, longitude=72.920,
            input_product="Milk", input_capacity=400, processing_cost=190,
            output_product="Paneer", estimated_output=0.20, distance_km=10,
            contact_email="farmerhelp@amuldairy.com", contact_phone="+91-2692-258000",
            description="Leading dairy cooperative processing centre. Instant testing, fair fat-testing machines, "
                        "and direct DBT payments to farmers' bank accounts.",
        ),

        # Uttar Pradesh
        ProcessingUnit(
            name="Sunrise Tomato Processing Co.", location="Bareilly, Uttar Pradesh",
            latitude=28.347, longitude=79.420,
            input_product="Tomato", input_capacity=50, processing_cost=300,
            output_product="Tomato Puree", estimated_output=0.35, distance_km=12,
            contact_email="orders@sunrisetomato.in", contact_phone="+91-9870012345",
            description="State-of-the-art tomato processing facility with cold-chain handling. "
                        "Certified by FSSAI. Accepts contract farming produce. Payment within 7 days. "
                        "Capacity: 50 MT/day. Produces puree, ketchup concentrate and canned tomatoes.",
        ),
        ProcessingUnit(
            name="Ganges Mango Co. Pvt Ltd", location="Shahjahanpur, Uttar Pradesh",
            latitude=27.883, longitude=79.908,
            input_product="Mango", input_capacity=30, processing_cost=450,
            output_product="Mango Pulp", estimated_output=0.6, distance_km=35,
            contact_email="procurement@gangesmango.com", contact_phone="+91-9455098765",
            description="Leading Alphonso & Dasheri mango pulp exporter with 15+ years experience. "
                        "ISO 22000:2018 certified. Exports to UAE, UK, USA. Handles Safeda, Dashehari & Langra varieties. "
                        "Minimum intake: 5 MT per lot. Free farm pick-up above 10 MT.",
        ),
        ProcessingUnit(
            name="Local Dairy Cooperative (LDCC)", location="Bareilly, Uttar Pradesh",
            latitude=28.363, longitude=79.398,
            input_product="Milk", input_capacity=200, processing_cost=200,
            output_product="Paneer", estimated_output=0.2, distance_km=10,
            contact_email="milk@ldcc-bareilly.coop", contact_phone="+91-5812-245678",
            description="Farmer-owned cooperative with 3,200 member households. "
                        "Processes milk into paneer, ghee, curd and butter. "
                        "Daily collection route covers 40 km radius. "
                        "Guaranteed minimum price above MSP. NDDB affiliated.",
        ),

        # South India
        ProcessingUnit(
            name="Mysore Agro Food Industries", location="Bengaluru, Karnataka",
            latitude=12.960, longitude=77.580,
            input_product="Tomato", input_capacity=65, processing_cost=280,
            output_product="Tomato Puree", estimated_output=0.35, distance_km=14,
            contact_email="procure@mysoreagro.com", contact_phone="+91-9845099881",
            description="Automated continuous processing unit supplying purees and pastes to retail brands. "
                        "Direct farmgate pickup available for volumes exceeding 10 MT.",
        ),
        ProcessingUnit(
            name="Malabar Fruit & Pulp Processing Co", location="Kochi, Kerala",
            latitude=9.950, longitude=76.280,
            input_product="Mango", input_capacity=40, processing_cost=440,
            output_product="Mango Pulp", estimated_output=0.58, distance_km=11,
            contact_email="orders@malabarfruits.in", contact_phone="+91-9847055667",
            description="Certified fruit processing unit handling mangoes, pineapples and tropical fruits. "
                        "Supplies aseptic packaging for domestic beverage brands and international export.",
        ),
    ]
    db.add_all(processing)


def seed_if_empty(db: Optional[Session] = None) -> None:
    """
    Checks all core tables and auto-seeds them if empty.
    Runs safely on server startup and on first requests.
    """
    owns_session = db is None
    if owns_session:
        init_db()
        db = SessionLocal()
    try:
        seed_markets_and_prices(db)
        seed_buyers(db)
        seed_storage(db)
        seed_processing(db)
        db.commit()
    finally:
        if owns_session:
            db.close()


def seed(db: Optional[Session] = None) -> None:
    seed_if_empty(db)


if __name__ == "__main__":
    seed()
