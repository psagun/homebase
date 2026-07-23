"""Seed endpoint — creates a demo user and sample properties."""

import uuid
from datetime import date

import bcrypt
from fastapi import APIRouter

from backend.database import Base, SessionLocal, engine
from backend.models.property import Property, PropertyStatus, PropertyType
from backend.models.user import User

router = APIRouter()

DEMO_EMAIL = "demo@homebase.app"
DEMO_PASSWORD = "demo1234"
DEMO_NAME = "Demo User"

PROPERTIES = [
    Property(
        name="Sunset Villa",
        address_line_1="123 Ocean Drive",
        city="Miami",
        state="FL",
        postal_code="33101",
        country="US",
        property_type=PropertyType.SINGLE_FAMILY,
        status=PropertyStatus.OCCUPIED,
        purchase_date=date(2021, 3, 15),
        purchase_price=450000,
        current_value=525000,
        lot_size=0.25,
        bedrooms=4,
        bathrooms=2.5,
        year_built=2018,
        notes="Modern waterfront villa with stunning ocean views. Tenant pays $3,800/mo.",
    ),
    Property(
        name="Downtown Office",
        address_line_1="456 Business Ave",
        address_line_2="Suite 300",
        city="New York",
        state="NY",
        postal_code="10001",
        country="US",
        property_type=PropertyType.COMMERCIAL,
        status=PropertyStatus.OCCUPIED,
        purchase_date=date(2019, 7, 1),
        purchase_price=1200000,
        current_value=1350000,
        lot_size=None,
        bedrooms=None,
        bathrooms=3,
        year_built=2010,
        notes="Class A office space. Multi-year lease at $12,500/mo.",
    ),
    Property(
        name="Harbor Loft",
        address_line_1="789 Harbor Blvd",
        city="San Francisco",
        state="CA",
        postal_code="94105",
        country="US",
        property_type=PropertyType.CONDO,
        status=PropertyStatus.OCCUPIED,
        purchase_date=date(2022, 1, 20),
        purchase_price=780000,
        current_value=890000,
        lot_size=None,
        bedrooms=2,
        bathrooms=2,
        year_built=2020,
        notes="Industrial-chic loft with bay views. Short-term rental avg $5,200/mo.",
    ),
    Property(
        name="Green Acres Land",
        address_line_1="1000 Country Road",
        city="Austin",
        state="TX",
        postal_code="73301",
        country="US",
        property_type=PropertyType.LAND,
        status=PropertyStatus.VACANT,
        purchase_date=date(2023, 5, 10),
        purchase_price=200000,
        current_value=230000,
        lot_size=1.0,
        bedrooms=None,
        bathrooms=None,
        year_built=None,
        notes="Prime development land with utilities available. Holding for appreciation.",
    ),
    Property(
        name="Riverfront Warehouse",
        address_line_1="200 Industrial Pkwy",
        city="Chicago",
        state="IL",
        postal_code="60607",
        country="US",
        property_type=PropertyType.COMMERCIAL,
        status=PropertyStatus.OCCUPIED,
        purchase_date=date(2020, 11, 1),
        purchase_price=950000,
        current_value=980000,
        lot_size=2.5,
        bedrooms=None,
        bathrooms=4,
        year_built=2005,
        notes="Distribution warehouse with river access. Triple-net lease at $8,500/mo.",
    ),
    Property(
        name="Parkview Condo",
        address_line_1="55 Central Park West",
        city="New York",
        state="NY",
        postal_code="10023",
        country="US",
        property_type=PropertyType.CONDO,
        status=PropertyStatus.UNDER_MAINTENANCE,
        purchase_date=date(2021, 8, 15),
        purchase_price=620000,
        current_value=610000,
        lot_size=None,
        bedrooms=2,
        bathrooms=1,
        year_built=2000,
        notes="Under renovation — new HVAC and flooring. Expected to rent for $4,000/mo.",
    ),
    Property(
        name="Main Street Retail",
        address_line_1="1420 Main Street",
        city="Denver",
        state="CO",
        postal_code="80202",
        country="US",
        property_type=PropertyType.COMMERCIAL,
        status=PropertyStatus.OCCUPIED,
        purchase_date=date(2022, 6, 1),
        purchase_price=875000,
        current_value=920000,
        lot_size=0.15,
        bedrooms=None,
        bathrooms=2,
        year_built=2015,
        notes="Retail space on main thoroughfare. Bakery tenant, 5-year lease at $6,200/mo.",
    ),
    Property(
        name="Lakeside Cottage",
        address_line_1="88 Lakeview Dr",
        city="Lake Tahoe",
        state="CA",
        postal_code="96150",
        country="US",
        property_type=PropertyType.SINGLE_FAMILY,
        status=PropertyStatus.VACANT,
        purchase_date=date(2024, 2, 10),
        purchase_price=340000,
        current_value=355000,
        lot_size=0.5,
        bedrooms=3,
        bathrooms=2,
        year_built=1995,
        notes="Vacation rental property. Between tenants — minor renovations underway.",
    ),
    Property(
        name="Oakwood Townhomes",
        address_line_1="500 Oakwood Lane",
        city="Atlanta",
        state="GA",
        postal_code="30301",
        country="US",
        property_type=PropertyType.MULTI_FAMILY,
        status=PropertyStatus.OCCUPIED,
        purchase_date=date(2018, 4, 1),
        purchase_price=1200000,
        current_value=1450000,
        lot_size=0.75,
        bedrooms=8,
        bathrooms=6,
        year_built=2016,
        notes="4-unit townhome complex. All units occupied. Total monthly rent: $9,600.",
    ),
    Property(
        name="Desert Oasis",
        address_line_1="1 Palm Canyon Rd",
        city="Phoenix",
        state="AZ",
        postal_code="85001",
        country="US",
        property_type=PropertyType.SINGLE_FAMILY,
        status=PropertyStatus.FOR_SALE,
        purchase_date=date(2017, 9, 15),
        purchase_price=280000,
        current_value=320000,
        lot_size=0.33,
        bedrooms=3,
        bathrooms=2,
        year_built=2005,
        notes="Recently renovated. Listed for sale at $339,000.",
    ),
]


@router.get("")
def seed_database():
    """Seed the database with a demo user and sample properties."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        existing = db.query(User).filter(User.email == DEMO_EMAIL).first()
        if existing:
            return {
                "status": "skipped",
                "message": f"Demo user '{DEMO_EMAIL}' already exists.",
                "demo_email": DEMO_EMAIL,
                "demo_password": DEMO_PASSWORD,
            }

        demo_user = User(
            id=uuid.uuid4(),
            email=DEMO_EMAIL,
            password_hash=bcrypt.hashpw(
                DEMO_PASSWORD.encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8"),
            name=DEMO_NAME,
        )
        db.add(demo_user)
        db.flush()

        for prop in PROPERTIES:
            prop.user_id = demo_user.id
            prop.id = uuid.uuid4()
            db.add(prop)

        db.commit()

        return {
            "status": "ok",
            "message": f"Created demo user with {len(PROPERTIES)} sample properties.",
            "demo_email": DEMO_EMAIL,
            "demo_password": DEMO_PASSWORD,
        }

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()
