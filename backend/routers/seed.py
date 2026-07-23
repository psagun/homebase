"""Seed endpoint — creates a full demo dataset."""

import uuid
from datetime import date, timedelta

import bcrypt
from fastapi import APIRouter, Query

from backend.config import settings
from backend.database import Base, SessionLocal, engine
from backend.models.contact import Contact, ContactType, property_contacts
from backend.models.insurance_policy import InsurancePolicy
from backend.models.maintenance_record import MaintenanceRecord
from backend.models.mortgage import Mortgage
from backend.models.property import Property, PropertyStatus, PropertyType
from backend.models.task import Task, TaskPriority, TaskStatus, TaskType
from backend.models.tenant import Tenant
from backend.models.transaction import Transaction, TransactionCategory, TransactionType
from backend.models.user import User

router = APIRouter()

DEMO_EMAIL = "demo@homebase.app"
DEMO_PASSWORD = "demo1234"
DEMO_NAME = "Demo User"

TODAY = date.today()


def _make_properties(db, demo_user_id):
    """Seed 10 sample properties and return {name: id} mapping."""
    raw = [
        Property(
            name="Sunset Villa",
            address_line_1="123 Ocean Drive",
            city="Miami", state="FL", postal_code="33101",
            property_type=PropertyType.SINGLE_FAMILY,
            status=PropertyStatus.OCCUPIED,
            purchase_date=date(2021, 3, 15),
            purchase_price=450000, current_value=525000,
            lot_size=0.25, bedrooms=4, bathrooms=2.5, year_built=2018,
            notes="Modern waterfront villa with stunning ocean views. Tenant pays $3,800/mo.",
        ),
        Property(
            name="Downtown Office",
            address_line_1="456 Business Ave", address_line_2="Suite 300",
            city="New York", state="NY", postal_code="10001",
            property_type=PropertyType.COMMERCIAL,
            status=PropertyStatus.OCCUPIED,
            purchase_date=date(2019, 7, 1),
            purchase_price=1200000, current_value=1350000,
            lot_size=None, bedrooms=None, bathrooms=3, year_built=2010,
            notes="Class A office space. Multi-year lease at $12,500/mo.",
        ),
        Property(
            name="Harbor Loft",
            address_line_1="789 Harbor Blvd",
            city="San Francisco", state="CA", postal_code="94105",
            property_type=PropertyType.CONDO,
            status=PropertyStatus.OCCUPIED,
            purchase_date=date(2022, 1, 20),
            purchase_price=780000, current_value=890000,
            lot_size=None, bedrooms=2, bathrooms=2, year_built=2020,
            notes="Industrial-chic loft with bay views. Short-term rental avg $5,200/mo.",
        ),
        Property(
            name="Green Acres Land",
            address_line_1="1000 Country Road",
            city="Austin", state="TX", postal_code="73301",
            property_type=PropertyType.LAND, status=PropertyStatus.VACANT,
            purchase_date=date(2023, 5, 10),
            purchase_price=200000, current_value=230000,
            lot_size=1.0, bedrooms=None, bathrooms=None, year_built=None,
            notes="Prime development land with utilities available. Holding for appreciation.",
        ),
        Property(
            name="Riverfront Warehouse",
            address_line_1="200 Industrial Pkwy",
            city="Chicago", state="IL", postal_code="60607",
            property_type=PropertyType.COMMERCIAL,
            status=PropertyStatus.OCCUPIED,
            purchase_date=date(2020, 11, 1),
            purchase_price=950000, current_value=980000,
            lot_size=2.5, bedrooms=None, bathrooms=4, year_built=2005,
            notes="Distribution warehouse with river access. Triple-net lease at $8,500/mo.",
        ),
        Property(
            name="Parkview Condo",
            address_line_1="55 Central Park West",
            city="New York", state="NY", postal_code="10023",
            property_type=PropertyType.CONDO,
            status=PropertyStatus.UNDER_MAINTENANCE,
            purchase_date=date(2021, 8, 15),
            purchase_price=620000, current_value=610000,
            lot_size=None, bedrooms=2, bathrooms=1, year_built=2000,
            notes="Under renovation — new HVAC and flooring. Expected to rent for $4,000/mo.",
        ),
        Property(
            name="Main Street Retail",
            address_line_1="1420 Main Street",
            city="Denver", state="CO", postal_code="80202",
            property_type=PropertyType.COMMERCIAL,
            status=PropertyStatus.OCCUPIED,
            purchase_date=date(2022, 6, 1),
            purchase_price=875000, current_value=920000,
            lot_size=0.15, bedrooms=None, bathrooms=2, year_built=2015,
            notes="Retail space on main thoroughfare. Bakery tenant, 5-year lease at $6,200/mo.",
        ),
        Property(
            name="Lakeside Cottage",
            address_line_1="88 Lakeview Dr",
            city="Lake Tahoe", state="CA", postal_code="96150",
            property_type=PropertyType.SINGLE_FAMILY,
            status=PropertyStatus.VACANT,
            purchase_date=date(2024, 2, 10),
            purchase_price=340000, current_value=355000,
            lot_size=0.5, bedrooms=3, bathrooms=2, year_built=1995,
            notes="Vacation rental property. Between tenants — minor renovations underway.",
        ),
        Property(
            name="Oakwood Townhomes",
            address_line_1="500 Oakwood Lane",
            city="Atlanta", state="GA", postal_code="30301",
            property_type=PropertyType.MULTI_FAMILY,
            status=PropertyStatus.OCCUPIED,
            purchase_date=date(2018, 4, 1),
            purchase_price=1200000, current_value=1450000,
            lot_size=0.75, bedrooms=8, bathrooms=6, year_built=2016,
            notes="4-unit townhome complex. All units occupied. Total monthly rent: $9,600.",
        ),
        Property(
            name="Desert Oasis",
            address_line_1="1 Palm Canyon Rd",
            city="Phoenix", state="AZ", postal_code="85001",
            property_type=PropertyType.SINGLE_FAMILY,
            status=PropertyStatus.FOR_SALE,
            purchase_date=date(2017, 9, 15),
            purchase_price=280000, current_value=320000,
            lot_size=0.33, bedrooms=3, bathrooms=2, year_built=2005,
            notes="Recently renovated. Listed for sale at $339,000.",
        ),
    ]
    result = {}
    for p in raw:
        p.id = uuid.uuid4()
        p.user_id = demo_user_id
        db.add(p)
        result[p.name] = p
    db.flush()
    return result


def _make_mortgages(db, uid, props):
    """Mortgages for financed properties."""
    data = [
        Mortgage(
            property_id=props["Sunset Villa"].id,
            lender_name="Wells Fargo", loan_number="WF-3847291",
            loan_type="30-Year Fixed", interest_rate=3.500,
            original_amount=360000, current_balance=312000,
            monthly_payment=1616, loan_term_months=360,
            start_date=date(2021, 3, 15), maturity_date=date(2051, 3, 15),
            next_due_date=TODAY.replace(day=1) + timedelta(days=32),
            autopay_enabled=True,
        ),
        Mortgage(
            property_id=props["Downtown Office"].id,
            lender_name="Chase Commercial", loan_number="CH-88204",
            loan_type="20-Year Commercial", interest_rate=4.200,
            original_amount=960000, current_balance=795000,
            monthly_payment=5930, loan_term_months=240,
            start_date=date(2019, 7, 1), maturity_date=date(2039, 7, 1),
            next_due_date=TODAY.replace(day=1) + timedelta(days=15),
            autopay_enabled=True,
        ),
        Mortgage(
            property_id=props["Oakwood Townhomes"].id,
            lender_name="Bank of America", loan_number="BOA-55123",
            loan_type="25-Year Commercial", interest_rate=3.800,
            original_amount=960000, current_balance=720000,
            monthly_payment=4950, loan_term_months=300,
            start_date=date(2018, 4, 1), maturity_date=date(2043, 4, 1),
            next_due_date=TODAY.replace(day=1) + timedelta(days=7),
            autopay_enabled=False,
        ),
        Mortgage(
            property_id=props["Riverfront Warehouse"].id,
            lender_name="PNC Commercial", loan_number="PNC-66290",
            loan_type="20-Year Commercial", interest_rate=4.500,
            original_amount=760000, current_balance=620000,
            monthly_payment=4800, loan_term_months=240,
            start_date=date(2020, 11, 1), maturity_date=date(2040, 11, 1),
            next_due_date=TODAY.replace(day=1) + timedelta(days=21),
            autopay_enabled=True,
        ),
        Mortgage(
            property_id=props["Main Street Retail"].id,
            lender_name="US Bank", loan_number="USB-33418",
            loan_type="15-Year Commercial", interest_rate=4.000,
            original_amount=700000, current_balance=580000,
            monthly_payment=5180, loan_term_months=180,
            start_date=date(2022, 6, 1), maturity_date=date(2037, 6, 1),
            next_due_date=TODAY.replace(day=1) + timedelta(days=10),
            autopay_enabled=True,
        ),
    ]
    for m in data:
        m.id = uuid.uuid4()
        db.add(m)
    db.flush()


def _make_insurance(db, uid, props):
    """Insurance for all properties."""
    policies = [
        InsurancePolicy(
            property_id=props["Sunset Villa"].id,
            provider_name="State Farm", policy_number="SF-1001",
            policy_type="Landlord Insurance", coverage_amount=550000,
            deductible=2500, annual_premium=1800,
            effective_date=date(2024, 1, 1), expiration_date=date(2025, 1, 1),
            renewal_date=date(2024, 12, 1),
            agent_name="Mike Johnson", agent_phone="(305) 555-0101",
            agent_email="mike@statefarm.com",
        ),
        InsurancePolicy(
            property_id=props["Downtown Office"].id,
            provider_name="Travelers", policy_number="TR-2002",
            policy_type="Commercial Property", coverage_amount=1500000,
            deductible=5000, annual_premium=4200,
            effective_date=date(2024, 6, 1), expiration_date=date(2025, 6, 1),
            renewal_date=date(2025, 5, 1),
            agent_name="Sarah Chen", agent_phone="(212) 555-0202",
            agent_email="sarah@travelers.com",
        ),
        InsurancePolicy(
            property_id=props["Harbor Loft"].id,
            provider_name="Allstate", policy_number="AL-3003",
            policy_type="Condo Insurance", coverage_amount=900000,
            deductible=1500, annual_premium=1200,
            effective_date=date(2024, 2, 1), expiration_date=date(2025, 2, 1),
            renewal_date=date(2025, 1, 1),
            agent_name="David Park", agent_phone="(415) 555-0303",
            agent_email="david@allstate.com",
        ),
        InsurancePolicy(
            property_id=props["Green Acres Land"].id,
            provider_name="Liberty Mutual", policy_number="LM-4004",
            policy_type="Land Liability", coverage_amount=500000,
            deductible=1000, annual_premium=600,
            effective_date=date(2024, 3, 1), expiration_date=date(2025, 3, 1),
            renewal_date=date(2025, 2, 1),
            agent_name="Tom Miller", agent_phone="(512) 555-0404",
            agent_email="tom@libertymutual.com",
        ),
        InsurancePolicy(
            property_id=props["Riverfront Warehouse"].id,
            provider_name="The Hartford", policy_number="TH-5005",
            policy_type="Warehouse Insurance", coverage_amount=1100000,
            deductible=7500, annual_premium=5600,
            effective_date=date(2024, 5, 1), expiration_date=date(2025, 5, 1),
            renewal_date=date(2025, 4, 1),
            agent_name="Lisa Brown", agent_phone="(312) 555-0505",
            agent_email="lisa@thehartford.com",
        ),
        InsurancePolicy(
            property_id=props["Parkview Condo"].id,
            provider_name="Allstate", policy_number="AL-6006",
            policy_type="Condo Insurance", coverage_amount=650000,
            deductible=1500, annual_premium=1100,
            effective_date=date(2024, 1, 1), expiration_date=date(2025, 1, 1),
            renewal_date=date(2024, 12, 1),
            agent_name="David Park", agent_phone="(415) 555-0303",
            agent_email="david@allstate.com",
        ),
        InsurancePolicy(
            property_id=props["Main Street Retail"].id,
            provider_name="Travelers", policy_number="TR-7007",
            policy_type="Retail Property", coverage_amount=1000000,
            deductible=5000, annual_premium=3800,
            effective_date=date(2024, 6, 1), expiration_date=date(2025, 6, 1),
            renewal_date=date(2025, 5, 1),
            agent_name="Sarah Chen", agent_phone="(212) 555-0202",
            agent_email="sarah@travelers.com",
        ),
        InsurancePolicy(
            property_id=props["Lakeside Cottage"].id,
            provider_name="State Farm", policy_number="SF-8008",
            policy_type="Vacation Rental Insurance", coverage_amount=375000,
            deductible=2000, annual_premium=1400,
            effective_date=date(2024, 4, 1), expiration_date=date(2025, 4, 1),
            renewal_date=date(2025, 3, 1),
            agent_name="Mike Johnson", agent_phone="(305) 555-0101",
            agent_email="mike@statefarm.com",
        ),
        InsurancePolicy(
            property_id=props["Oakwood Townhomes"].id,
            provider_name="Nationwide", policy_number="NW-9009",
            policy_type="Multi-Family Property", coverage_amount=1600000,
            deductible=5000, annual_premium=4800,
            effective_date=date(2024, 1, 1), expiration_date=date(2025, 1, 1),
            renewal_date=date(2024, 12, 1),
            agent_name="Rachel Green", agent_phone="(404) 555-0909",
            agent_email="rachel@nationwide.com",
        ),
        InsurancePolicy(
            property_id=props["Desert Oasis"].id,
            provider_name="Liberty Mutual", policy_number="LM-1010",
            policy_type="Homeowner Insurance", coverage_amount=350000,
            deductible=2000, annual_premium=1300,
            effective_date=date(2024, 1, 1), expiration_date=date(2025, 1, 1),
            renewal_date=date(2024, 12, 1),
            agent_name="Tom Miller", agent_phone="(512) 555-0404",
            agent_email="tom@libertymutual.com",
        ),
    ]
    for p in policies:
        p.id = uuid.uuid4()
        db.add(p)
    db.flush()


def _make_contacts(db, uid, props):
    """Tenants, lenders, agents, contractors."""
    contacts_raw = [
        # Tenants
        Contact(name="Alex Rivera", company="", phone="(305) 555-1001",
                email="alex.rivera@email.com", contact_type=ContactType.TENANT,
                notes="Sunset Villa tenant since 2021. Pays on time."),
        Contact(name="TechCorp Inc.", company="TechCorp Inc.", phone="(212) 555-2001",
                email="facilities@techcorp.com", contact_type=ContactType.TENANT,
                notes="Downtown Office anchor tenant. Multi-year lease."),
        Contact(name="Elena Torres", company="", phone="(415) 555-3001",
                email="elena.torres@email.com", contact_type=ContactType.TENANT,
                notes="Harbor Loft short-term rental guest."),
        Contact(name="BigBox Logistics", company="BigBox Logistics",
                phone="(312) 555-5001", email="ops@bigboxlogistics.com",
                contact_type=ContactType.TENANT,
                notes="Riverfront Warehouse tenant. Triple-net lease."),
        Contact(name="Bella's Bakery", company="Bella's Bakery LLC",
                phone="(303) 555-7001", email="bella@bellasbakery.com",
                contact_type=ContactType.TENANT,
                notes="Main Street Retail tenant. Great credit."),
        Contact(name="Marcus Williams", company="", phone="(470) 555-9001",
                email="marcus.w@email.com", contact_type=ContactType.TENANT,
                notes="Oakwood Townhomes - Unit A tenant."),
        Contact(name="Priya Patel", company="", phone="(470) 555-9002",
                email="priya.p@email.com", contact_type=ContactType.TENANT,
                notes="Oakwood Townhomes - Unit B tenant."),
        Contact(name="James O'Brien", company="", phone="(470) 555-9003",
                email="james.ob@email.com", contact_type=ContactType.TENANT,
                notes="Oakwood Townhomes - Unit C tenant."),
        Contact(name="Kim Nguyen", company="", phone="(470) 555-9004",
                email="kim.n@email.com", contact_type=ContactType.TENANT,
                notes="Oakwood Townhomes - Unit D tenant."),
        # Lenders
        Contact(name="Jennifer Walsh", company="Wells Fargo",
                phone="(800) 555-4100", email="jennifer.walsh@wellsfargo.com",
                contact_type=ContactType.MORTGAGE_LENDER,
                notes="Sunset Villa loan officer."),
        Contact(name="Robert Kim", company="Chase Commercial",
                phone="(212) 555-4200", email="robert.kim@chase.com",
                contact_type=ContactType.MORTGAGE_LENDER,
                notes="Downtown Office & commercial lending."),
        Contact(name="Patricia Adams", company="Bank of America",
                phone="(404) 555-4300", email="patricia.adams@bofa.com",
                contact_type=ContactType.MORTGAGE_LENDER,
                notes="Oakwood Townhomes loan."),
        # Insurance agents
        Contact(name="Mike Johnson", company="State Farm",
                phone="(305) 555-0101", email="mike@statefarm.com",
                contact_type=ContactType.INSURANCE_AGENT),
        Contact(name="Sarah Chen", company="Travelers",
                phone="(212) 555-0202", email="sarah@travelers.com",
                contact_type=ContactType.INSURANCE_AGENT),
        # Contractors
        Contact(name="Carlos Mendez", company="Mendez Construction",
                phone="(212) 555-6001", email="carlos@mendezconstruction.com",
                contact_type=ContactType.CONTRACTOR,
                notes="HVAC specialist. Working on Parkview Condo."),
        Contact(name="GreenScape Pros", company="GreenScape Pros LLC",
                phone="(305) 555-7001", email="info@greenscapepros.com",
                contact_type=ContactType.CONTRACTOR,
                notes="Landscaping for Sunset Villa."),
        # Property manager
        Contact(name="Amy Chen", company="Premier Property Management",
                phone="(305) 555-8001", email="amy@premierpm.com",
                contact_type=ContactType.PROPERTY_MANAGER,
                notes="Handles day-to-day for Miami and Atlanta properties."),
        # Realtor
        Contact(name="John Smith", company="Smith Realty Group",
                phone="(602) 555-1000", email="john@smithrealty.com",
                contact_type=ContactType.REALTOR,
                notes="Listing agent for Desert Oasis."),
    ]
    prop_by_name = {p.name: p for p in props.values()}
    contact_map = {}
    for c in contacts_raw:
        c.id = uuid.uuid4()
        c.user_id = uid
        db.add(c)
        contact_map[c.name] = c
    db.flush()

    # Link contacts to properties
    links = [
        ("Alex Rivera", ["Sunset Villa"]),
        ("TechCorp Inc.", ["Downtown Office"]),
        ("Elena Torres", ["Harbor Loft"]),
        ("BigBox Logistics", ["Riverfront Warehouse"]),
        ("Bella's Bakery", ["Main Street Retail"]),
        ("Marcus Williams", ["Oakwood Townhomes"]),
        ("Priya Patel", ["Oakwood Townhomes"]),
        ("James O'Brien", ["Oakwood Townhomes"]),
        ("Kim Nguyen", ["Oakwood Townhomes"]),
        ("Jennifer Walsh", ["Sunset Villa"]),
        ("Robert Kim", ["Downtown Office", "Oakwood Townhomes"]),
        ("Patricia Adams", ["Oakwood Townhomes"]),
        ("Mike Johnson", ["Sunset Villa", "Lakeside Cottage"]),
        ("Sarah Chen", ["Downtown Office", "Main Street Retail"]),
        ("Carlos Mendez", ["Parkview Condo"]),
        ("GreenScape Pros", ["Sunset Villa"]),
        ("Amy Chen", ["Sunset Villa", "Oakwood Townhomes"]),
        ("John Smith", ["Desert Oasis"]),
    ]
    for contact_name, property_names in links:
        contact = contact_map.get(contact_name)
        if not contact:
            continue
        for pname in property_names:
            prop = prop_by_name.get(pname)
            if prop:
                stmt = property_contacts.insert().values(
                    property_id=prop.id, contact_id=contact.id
                )
                db.execute(stmt)
    db.flush()


def _make_tenants(db, uid, props):
    """Tenants for occupied properties."""
    tenants_raw = [
        Tenant(property_id=props["Sunset Villa"].id,
               name="Alex Rivera", email="alex.rivera@email.com",
               phone="(305) 555-1001",
               move_in_date=date(2021, 4, 1),
               lease_start=date(2024, 4, 1), lease_end=date(2025, 3, 31),
               monthly_rent=3800, security_deposit=3800),
        Tenant(property_id=props["Harbor Loft"].id,
               name="Elena Torres", email="elena.torres@email.com",
               phone="(415) 555-3001",
               move_in_date=date(2024, 6, 15),
               lease_start=date(2024, 6, 15), lease_end=date(2024, 12, 15),
               monthly_rent=5200, security_deposit=5200),
        Tenant(property_id=props["Oakwood Townhomes"].id,
               name="Marcus Williams", email="marcus.w@email.com",
               phone="(470) 555-9001",
               move_in_date=date(2022, 3, 1),
               lease_start=date(2024, 3, 1), lease_end=date(2025, 2, 28),
               monthly_rent=2400, security_deposit=2400),
        Tenant(property_id=props["Oakwood Townhomes"].id,
               name="Priya Patel", email="priya.p@email.com",
               phone="(470) 555-9002",
               move_in_date=date(2023, 1, 15),
               lease_start=date(2024, 1, 15), lease_end=date(2025, 1, 14),
               monthly_rent=2400, security_deposit=2400),
        Tenant(property_id=props["Oakwood Townhomes"].id,
               name="James O'Brien", email="james.ob@email.com",
               phone="(470) 555-9003",
               move_in_date=date(2021, 9, 1),
               lease_start=date(2024, 9, 1), lease_end=date(2025, 8, 31),
               monthly_rent=2400, security_deposit=2400),
        Tenant(property_id=props["Oakwood Townhomes"].id,
               name="Kim Nguyen", email="kim.n@email.com",
               phone="(470) 555-9004",
               move_in_date=date(2024, 2, 1),
               lease_start=date(2024, 2, 1), lease_end=date(2025, 1, 31),
               monthly_rent=2400, security_deposit=2400),
    ]
    for t in tenants_raw:
        t.id = uuid.uuid4()
        db.add(t)
    db.flush()


def _make_transactions(db, uid, props):
    """6 months of income/expense transactions for occupied properties."""
    txns = []

    # Monthly rent income (last 6 months)
    rent_schedule = [
        ("Sunset Villa", 3800),
        ("Downtown Office", 12500),
        ("Harbor Loft", 5200),
        ("Riverfront Warehouse", 8500),
        ("Main Street Retail", 6200),
        ("Oakwood Townhomes", 9600),
    ]

    for month_offset in range(5, -1, -1):
        txn_date = TODAY.replace(day=1) - timedelta(days=month_offset * 30)
        for pname, amount in rent_schedule:
            prop = props.get(pname)
            if not prop:
                continue
            txns.append(Transaction(
                property_id=prop.id, user_id=uid,
                transaction_type=TransactionType.INCOME,
                category=TransactionCategory.RENT,
                amount=amount, transaction_date=txn_date,
                description=f"Rent payment - {pname} - {txn_date.strftime('%b %Y')}",
            ))

    # One-time income entries
    txns.append(Transaction(
        property_id=props["Oakwood Townhomes"].id, user_id=uid,
        transaction_type=TransactionType.INCOME,
        category=TransactionCategory.STORAGE,
        amount=350,
        transaction_date=TODAY - timedelta(days=45),
        description="Storage unit rental - Oakwood Townhomes",
    ))

    # Mortgage payments (last 6 months)
    mortgage_schedule = [
        ("Sunset Villa", 1616),
        ("Downtown Office", 5930),
        ("Oakwood Townhomes", 4950),
        ("Riverfront Warehouse", 4800),
        ("Main Street Retail", 5180),
    ]
    for month_offset in range(5, -1, -1):
        txn_date = TODAY.replace(day=15) - timedelta(days=month_offset * 30)
        for pname, amount in mortgage_schedule:
            prop = props.get(pname)
            if not prop:
                continue
            txns.append(Transaction(
                property_id=prop.id, user_id=uid,
                transaction_type=TransactionType.EXPENSE,
                category=TransactionCategory.MORTGAGE,
                amount=amount, transaction_date=txn_date,
                description=f"Mortgage payment - {pname}",
            ))

    # Insurance payments (annual, lump sum)
    insurance_schedule = [
        ("Sunset Villa", 1800, date(2024, 1, 15)),
        ("Downtown Office", 4200, date(2024, 6, 15)),
        ("Harbor Loft", 1200, date(2024, 2, 15)),
        ("Green Acres Land", 600, date(2024, 3, 15)),
        ("Riverfront Warehouse", 5600, date(2024, 5, 15)),
        ("Parkview Condo", 1100, date(2024, 1, 15)),
        ("Main Street Retail", 3800, date(2024, 6, 15)),
        ("Lakeside Cottage", 1400, date(2024, 4, 15)),
        ("Oakwood Townhomes", 4800, date(2024, 1, 15)),
        ("Desert Oasis", 1300, date(2024, 1, 15)),
    ]
    for pname, amount, txn_date in insurance_schedule:
        prop = props.get(pname)
        if not prop:
            continue
        txns.append(Transaction(
            property_id=prop.id, user_id=uid,
            transaction_type=TransactionType.EXPENSE,
            category=TransactionCategory.INSURANCE,
            amount=amount, transaction_date=txn_date,
            description=f"Annual insurance premium - {pname}",
        ))

    # Maintenance expenses
    maintenance_expenses = [
        ("Parkview Condo", 8500, TODAY - timedelta(days=30),
         "HVAC replacement - partial payment"),
        ("Parkview Condo", 3200, TODAY - timedelta(days=60),
         "Flooring installation"),
        ("Sunset Villa", 450, TODAY - timedelta(days=90),
         "Landscaping service"),
        ("Oakwood Townhomes", 1200, TODAY - timedelta(days=45),
         "Plumbing repair - Unit C"),
        ("Main Street Retail", 800, TODAY - timedelta(days=75),
         "Storefront window repair"),
    ]
    for pname, amount, txn_date, desc in maintenance_expenses:
        prop = props.get(pname)
        if not prop:
            continue
        txns.append(Transaction(
            property_id=prop.id, user_id=uid,
            transaction_type=TransactionType.EXPENSE,
            category=TransactionCategory.MAINTENANCE,
            amount=amount, transaction_date=txn_date,
            description=desc,
        ))

    # Property taxes (annual)
    tax_schedule = [
        ("Sunset Villa", 5200, date(2024, 11, 1)),
        ("Downtown Office", 18500, date(2024, 11, 1)),
        ("Harbor Loft", 8900, date(2024, 11, 1)),
        ("Oakwood Townhomes", 16800, date(2024, 11, 1)),
    ]
    for pname, amount, txn_date in tax_schedule:
        prop = props.get(pname)
        if not prop:
            continue
        txns.append(Transaction(
            property_id=prop.id, user_id=uid,
            transaction_type=TransactionType.EXPENSE,
            category=TransactionCategory.TAXES,
            amount=amount, transaction_date=txn_date,
            description=f"Annual property tax - {pname}",
        ))

    for t in txns:
        t.id = uuid.uuid4()
        db.add(t)
    db.flush()


def _make_tasks(db, uid, props):
    """Tasks for upcoming reminders and actions."""
    tasks = [
        # Rent collection (upcoming)
        Task(property_id=props["Sunset Villa"].id, user_id=uid,
             title="Collect rent - Sunset Villa",
             description="Monthly rent of $3,800 due from Alex Rivera.",
             task_type=TaskType.RENT_COLLECTION,
             due_date=TODAY + timedelta(days=5),
             priority=TaskPriority.HIGH, status=TaskStatus.UPCOMING),
        Task(property_id=props["Downtown Office"].id, user_id=uid,
             title="Collect rent - Downtown Office",
             description="Monthly rent of $12,500 due from TechCorp.",
             task_type=TaskType.RENT_COLLECTION,
             due_date=TODAY + timedelta(days=10),
             priority=TaskPriority.HIGH, status=TaskStatus.UPCOMING),
        Task(property_id=props["Harbor Loft"].id, user_id=uid,
             title="Collect rent - Harbor Loft",
             description="Monthly short-term rental payment of $5,200.",
             task_type=TaskType.RENT_COLLECTION,
             due_date=TODAY + timedelta(days=2),
             priority=TaskPriority.HIGH, status=TaskStatus.UPCOMING),
        Task(property_id=props["Riverfront Warehouse"].id, user_id=uid,
             title="Collect rent - Riverfront Warehouse",
             description="Triple-net lease payment of $8,500 from BigBox Logistics.",
             task_type=TaskType.RENT_COLLECTION,
             due_date=TODAY + timedelta(days=15),
             priority=TaskPriority.MEDIUM, status=TaskStatus.UPCOMING),
        Task(property_id=props["Main Street Retail"].id, user_id=uid,
             title="Collect rent - Main Street Retail",
             description="Monthly rent of $6,200 from Bella's Bakery.",
             task_type=TaskType.RENT_COLLECTION,
             due_date=TODAY + timedelta(days=7),
             priority=TaskPriority.HIGH, status=TaskStatus.UPCOMING),
        Task(property_id=props["Oakwood Townhomes"].id, user_id=uid,
             title="Collect rent - Oakwood Townhomes",
             description="Total $9,600 from all 4 units (Marcus, Priya, James, Kim).",
             task_type=TaskType.RENT_COLLECTION,
             due_date=TODAY + timedelta(days=1),
             priority=TaskPriority.HIGH, status=TaskStatus.DUE_TODAY),

        # Mortgage payments (upcoming)
        Task(property_id=props["Sunset Villa"].id, user_id=uid,
             title="Mortgage payment - Sunset Villa",
             description="Monthly mortgage of $1,616 to Wells Fargo (autopay).",
             task_type=TaskType.MORTGAGE_PAYMENT,
             due_date=TODAY + timedelta(days=3),
             priority=TaskPriority.MEDIUM, status=TaskStatus.UPCOMING),
        Task(property_id=props["Downtown Office"].id, user_id=uid,
             title="Mortgage payment - Downtown Office",
             description="Monthly commercial mortgage of $5,930 to Chase (autopay).",
             task_type=TaskType.MORTGAGE_PAYMENT,
             due_date=TODAY + timedelta(days=20),
             priority=TaskPriority.MEDIUM, status=TaskStatus.UPCOMING),

        # Insurance renewals
        Task(property_id=props["Sunset Villa"].id, user_id=uid,
             title="Renew insurance - Sunset Villa",
             description="State Farm landlord policy renews Dec 1. Annual premium $1,800.",
             task_type=TaskType.INSURANCE_RENEWAL,
             due_date=TODAY + timedelta(days=60),
             priority=TaskPriority.MEDIUM, status=TaskStatus.UPCOMING),
        Task(property_id=props["Oakwood Townhomes"].id, user_id=uid,
             title="Renew insurance - Oakwood Townhomes",
             description="Nationwide multi-family policy renews Dec 1. Annual premium $4,800.",
             task_type=TaskType.INSURANCE_RENEWAL,
             due_date=TODAY + timedelta(days=60),
             priority=TaskPriority.MEDIUM, status=TaskStatus.UPCOMING),

        # Property taxes
        Task(property_id=props["Sunset Villa"].id, user_id=uid,
             title="Property tax due - Sunset Villa",
             description="Annual property tax of $5,200 due Nov 1.",
             task_type=TaskType.PROPERTY_TAX,
             due_date=date(TODAY.year, 11, 1),
             priority=TaskPriority.HIGH, status=TaskStatus.UPCOMING),
        Task(property_id=props["Downtown Office"].id, user_id=uid,
             title="Property tax due - Downtown Office",
             description="Annual property tax of $18,500 due Nov 1.",
             task_type=TaskType.PROPERTY_TAX,
             due_date=date(TODAY.year, 11, 1),
             priority=TaskPriority.HIGH, status=TaskStatus.UPCOMING),
        Task(property_id=props["Oakwood Townhomes"].id, user_id=uid,
             title="Property tax due - Oakwood Townhomes",
             description="Annual property tax of $16,800 due Nov 1.",
             task_type=TaskType.PROPERTY_TAX,
             due_date=date(TODAY.year, 11, 1),
             priority=TaskPriority.HIGH, status=TaskStatus.UPCOMING),

        # Lease renewals
        Task(property_id=props["Sunset Villa"].id, user_id=uid,
             title="Lease renewal - Sunset Villa",
             description="Alex Rivera's lease expires Mar 31. Send renewal notice.",
             task_type=TaskType.LEASE_RENEWAL,
             due_date=date(TODAY.year + 1, 3, 1),
             priority=TaskPriority.MEDIUM, status=TaskStatus.UPCOMING),
        Task(property_id=props["Oakwood Townhomes"].id, user_id=uid,
             title="Lease renewal - Oakwood Unit B (Priya)",
             description="Priya Patel's lease expires Jan 14. Send renewal notice.",
             task_type=TaskType.LEASE_RENEWAL,
             due_date=date(TODAY.year + 1, 1, 1),
             priority=TaskPriority.MEDIUM, status=TaskStatus.UPCOMING),

        # Maintenance tasks
        Task(property_id=props["Parkview Condo"].id, user_id=uid,
             title="Complete HVAC installation - Parkview Condo",
             description="Final inspection and testing of new HVAC system.",
             task_type=TaskType.MAINTENANCE,
             due_date=TODAY + timedelta(days=14),
             priority=TaskPriority.HIGH, status=TaskStatus.UPCOMING),
        Task(property_id=props["Parkview Condo"].id, user_id=uid,
             title="Paint living room - Parkview Condo",
             description="After flooring is complete, paint living room and hallway.",
             task_type=TaskType.MAINTENANCE,
             due_date=TODAY + timedelta(days=21),
             priority=TaskPriority.MEDIUM, status=TaskStatus.UPCOMING),
        Task(property_id=props["Lakeside Cottage"].id, user_id=uid,
             title="Winterize plumbing - Lakeside Cottage",
             description="Vacant property needs plumbing winterized before cold weather.",
             task_type=TaskType.MAINTENANCE,
             due_date=TODAY + timedelta(days=30),
             priority=TaskPriority.MEDIUM, status=TaskStatus.UPCOMING),

        # Completed/overdue tasks
        Task(property_id=props["Main Street Retail"].id, user_id=uid,
             title="Storefront window repaired",
             description="Replaced cracked storefront window.",
             task_type=TaskType.MAINTENANCE,
             due_date=TODAY - timedelta(days=75),
             priority=TaskPriority.MEDIUM, status=TaskStatus.COMPLETED,
             completed_at=TODAY - timedelta(days=73)),
        Task(property_id=props["Oakwood Townhomes"].id, user_id=uid,
             title="Plumbing repair - Oakwood Unit C",
             description="Fixed leak under kitchen sink.",
             task_type=TaskType.MAINTENANCE,
             due_date=TODAY - timedelta(days=45),
             priority=TaskPriority.MEDIUM, status=TaskStatus.COMPLETED,
             completed_at=TODAY - timedelta(days=43)),
        Task(property_id=props["Oakwood Townhomes"].id, user_id=uid,
             title="HOA dues - Oakwood Townhomes",
             description="Quarterly HOA dues of $600. Overdue!",
             task_type=TaskType.HOA_PAYMENT,
             due_date=TODAY - timedelta(days=10),
             priority=TaskPriority.CRITICAL, status=TaskStatus.OVERDUE),
        Task(property_id=props["Desert Oasis"].id, user_id=uid,
             title="Follow up with realtor - Desert Oasis",
             description="Check in with John Smith about showing activity.",
             task_type=TaskType.CUSTOM,
             due_date=TODAY + timedelta(days=3),
             priority=TaskPriority.LOW, status=TaskStatus.UPCOMING),
        Task(property_id=props["Green Acres Land"].id, user_id=uid,
             title="Property tax payment - Green Acres Land",
             description="Annual land tax of $2,100 due next month.",
             task_type=TaskType.PROPERTY_TAX,
             due_date=TODAY + timedelta(days=35),
             priority=TaskPriority.MEDIUM, status=TaskStatus.UPCOMING),
    ]
    for t in tasks:
        t.id = uuid.uuid4()
        db.add(t)
    db.flush()


def _make_maintenance(db, uid, props):
    records = [
        MaintenanceRecord(
            property_id=props["Parkview Condo"].id,
            title="HVAC Replacement",
            description="Replaced old HVAC unit with new energy-efficient model.",
            date=TODAY - timedelta(days=30), cost=8500,
            contractor="Mendez Construction",
            warranty_expiration=date(TODAY.year + 5, 7, 23),
        ),
        MaintenanceRecord(
            property_id=props["Parkview Condo"].id,
            title="Flooring Installation",
            description="Installed new hardwood flooring in living room and hallway.",
            date=TODAY - timedelta(days=60), cost=3200,
            contractor="Mendez Construction",
        ),
        MaintenanceRecord(
            property_id=props["Sunset Villa"].id,
            title="Landscaping Service",
            description="Monthly landscaping - lawn mowing, hedge trimming, cleanup.",
            date=TODAY - timedelta(days=90), cost=450,
            contractor="GreenScape Pros",
        ),
        MaintenanceRecord(
            property_id=props["Oakwood Townhomes"].id,
            title="Plumbing Repair - Unit C",
            description="Fixed leak under kitchen sink in James O'Brien's unit.",
            date=TODAY - timedelta(days=45), cost=1200,
            contractor="Ace Plumbing",
        ),
        MaintenanceRecord(
            property_id=props["Main Street Retail"].id,
            title="Storefront Window Repair",
            description="Replaced cracked glass panel in storefront window.",
            date=TODAY - timedelta(days=75), cost=800,
            contractor="City Glass Works",
        ),
        MaintenanceRecord(
            property_id=props["Desert Oasis"].id,
            title="Full Interior Paint",
            description="Painted all interior rooms before listing for sale.",
            date=TODAY - timedelta(days=120), cost=3500,
            contractor="Mendez Construction",
        ),
        MaintenanceRecord(
            property_id=props["Lakeside Cottage"].id,
            title="Deck Staining",
            description="Stained and sealed back deck.",
            date=TODAY - timedelta(days=60), cost=950,
            contractor="GreenScape Pros",
        ),
    ]
    for r in records:
        r.id = uuid.uuid4()
        db.add(r)
    db.flush()


@router.get("")
def seed_database(key: str = Query(..., description="Seed secret key from CRON_SECRET")):
    """Seed the database with a full demo dataset."""
    if key != settings.cron_secret:
        return {"status": "error", "message": "Invalid seed key."}

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        existing_user = db.query(User).filter(User.email == DEMO_EMAIL).first()

        # Check if already fully seeded (tasks exist)
        task_count = db.query(Task).count()
        if task_count > 0:
            return {
                "status": "skipped",
                "message": "Database already fully seeded.",
                "demo_email": DEMO_EMAIL,
                "demo_password": DEMO_PASSWORD,
            }

        if existing_user:
            uid = existing_user.id
            existing_props = db.query(Property).filter(
                Property.user_id == uid
            ).count()
            if existing_props > 0:
                props = {p.name: p for p in db.query(Property).filter(
                    Property.user_id == uid
                ).all()}
            else:
                props = _make_properties(db, uid)
        else:
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
            uid = demo_user.id
            props = _make_properties(db, uid)

        # Seed all additional data
        _make_mortgages(db, uid, props)
        _make_insurance(db, uid, props)
        _make_contacts(db, uid, props)
        _make_tenants(db, uid, props)
        _make_transactions(db, uid, props)
        _make_tasks(db, uid, props)
        _make_maintenance(db, uid, props)

        db.commit()

        return {
            "status": "ok",
            "message": (
                f"Seeded: {len(props)} properties, "
                f"5 mortgages, 10 insurance policies, "
                f"19 contacts, 6 tenants, "
                f"45+ transactions, 23 tasks, "
                f"7 maintenance records."
            ),
            "demo_email": DEMO_EMAIL,
            "demo_password": DEMO_PASSWORD,
        }

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()
