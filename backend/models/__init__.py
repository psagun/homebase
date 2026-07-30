# Import models so Alembic discovers them
from backend.models.user import User  # noqa: F401
from backend.models.property import Property  # noqa: F401
from backend.models.mortgage import Mortgage  # noqa: F401
from backend.models.insurance_policy import InsurancePolicy  # noqa: F401
from backend.models.document import Document  # noqa: F401
from backend.models.task import Task  # noqa: F401
from backend.models.transaction import Transaction  # noqa: F401
from backend.models.contact import Contact, property_contacts, ContactType  # noqa: F401
from backend.models.property_tax import PropertyTax  # noqa: F401
from backend.models.tenant import Tenant  # noqa: F401
from backend.models.maintenance_record import MaintenanceRecord  # noqa: F401
from backend.models.recently_viewed import RecentlyViewed  # noqa: F401
from backend.models.property_investor import PropertyInvestor  # noqa: F401
from backend.models.ownership_entity import OwnershipEntity  # noqa: F401
from backend.models.investor import Investor  # noqa: F401
from backend.models.ownership_entity_investor import OwnershipEntityInvestor  # noqa: F401
