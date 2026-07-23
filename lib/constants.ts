export const PROPERTY_STATUSES = [
  "Occupied",
  "Vacant",
  "Under Maintenance",
  "For Sale",
] as const;

export const PROPERTY_TYPES = [
  "Single Family",
  "Condo",
  "Townhouse",
  "Multi-Family",
  "Land",
  "Commercial",
  "Other",
] as const;

export const TASK_TYPES = [
  "Mortgage Payment",
  "Insurance Renewal",
  "Property Tax",
  "HOA Payment",
  "Rent Collection",
  "Lease Renewal",
  "Maintenance",
  "Document Expiration",
  "Custom",
] as const;

export const TASK_PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;

export const TASK_STATUSES = [
  "Upcoming",
  "Due Today",
  "Overdue",
  "Completed",
  "Dismissed",
] as const;

export const DOCUMENT_CATEGORIES = [
  "Property",
  "Mortgage",
  "Insurance",
  "Tax",
  "Lease",
  "Maintenance",
  "HOA",
  "Other",
] as const;

export const TRANSACTION_CATEGORIES = {
  income: ["Rent", "Parking", "Storage", "Other Income"],
  expense: [
    "Mortgage",
    "Insurance",
    "Taxes",
    "HOA",
    "Maintenance",
    "Utilities",
    "Property Management",
    "Other",
  ],
} as const;

export const CONTACT_TYPES = [
  "Mortgage Lender",
  "Insurance Agent",
  "Property Manager",
  "Tenant",
  "Contractor",
  "Realtor",
  "HOA",
  "Tax Authority",
  "Utility Provider",
  "Attorney",
  "Accountant",
  "Other",
] as const;

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Properties", href: "/properties", icon: "Building2" },
  { label: "Tasks & Reminders", href: "/tasks", icon: "CheckSquare" },
  { label: "Calendar", href: "/calendar", icon: "Calendar" },
  { label: "Documents", href: "/documents", icon: "FileText" },
  { label: "Transactions", href: "/transactions", icon: "Receipt" },
  { label: "Reports", href: "/reports", icon: "BarChart3" },
  { label: "Contacts", href: "/contacts", icon: "Users" },
  { label: "Settings", href: "/settings", icon: "Settings" },
] as const;
