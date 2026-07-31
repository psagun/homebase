"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Users,
  Plus,
  Pencil,
  Trash2,
  FileText,
  X,
  Check,
  Landmark,
} from "lucide-react";
import { usePropertyOwnership, useEntities, useCreateEntity, useUpdateEntity, useSetPropertyEntity, useRemovePropertyEntity } from "@/lib/hooks/useOwnership";
import { useAddEntityInvestor, useUpdateEntityInvestor, useRemoveEntityInvestor } from "@/lib/hooks/useOwnership";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ActionsMenu } from "@/components/shared/ActionsMenu";
import type { EntityData } from "@/lib/api/ownership";

export default function OwnershipPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: ownership, isLoading, isError, refetch } = usePropertyOwnership(id);
  const { data: entities } = useEntities();
  const createEntity = useCreateEntity();
  const updateEntity = useUpdateEntity();
  const setEntity = useSetPropertyEntity(id);
  const removeEntity = useRemovePropertyEntity(id);

  const [showEntitySelector, setShowEntitySelector] = useState(false);
  const [showNewEntityForm, setShowNewEntityForm] = useState(false);
  const [editEntityMode, setEditEntityMode] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [newEntityName, setNewEntityName] = useState("");
  const [newEntityType, setNewEntityType] = useState("");
  const [newEntityEin, setNewEntityEin] = useState("");
  const [newEntityState, setNewEntityState] = useState("");

  if (isLoading) return <LoadingState text="Loading ownership info..." />;
  if (isError) return <ErrorState title="Failed to load ownership" onRetry={() => refetch()} />;

  const handleSelectEntity = async () => {
    if (!selectedEntityId) return;
    await setEntity.mutateAsync(selectedEntityId);
    setShowEntitySelector(false);
    setSelectedEntityId("");
    refetch();
  };

  const handleCreateAndAssign = async () => {
    if (!newEntityName.trim()) return;
    const entity = await createEntity.mutateAsync({
      name: newEntityName.trim(),
      entity_type: newEntityType.trim() || undefined,
      ein: newEntityEin.trim() || undefined,
      state_of_formation: newEntityState.trim() || undefined,
    });
    await setEntity.mutateAsync(entity.id);
    setShowNewEntityForm(false);
    setNewEntityName(""); setNewEntityType(""); setNewEntityEin(""); setNewEntityState("");
    refetch();
  };

  const handleEditEntity = async () => {
    if (!ownership?.entity) return;
    await updateEntity.mutateAsync({
      id: ownership.entity.id,
      data: {
        name: newEntityName.trim() || undefined,
        entity_type: newEntityType.trim() || undefined,
        ein: newEntityEin.trim() || undefined,
        state_of_formation: newEntityState.trim() || undefined,
      },
    });
    setEditEntityMode(false);
    setNewEntityName(""); setNewEntityType(""); setNewEntityEin(""); setNewEntityState("");
    refetch();
  };

  const handleRemoveEntity = async () => {
    if (confirm("Remove the ownership entity from this property? The entity will still exist for other properties.")) {
      await removeEntity.mutateAsync();
      refetch();
    }
  };

  const isIndividual = ownership?.ownership_type === "Individual";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ownership</h2>
      </div>

      {/* Ownership Type */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isIndividual ? (
              <Users className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Building2 className="h-5 w-5 text-primary" />
            )}
            <h3 className="text-sm font-semibold">
              {isIndividual ? "Individual Ownership" : "Business Entity"}
            </h3>
          </div>
          {!isIndividual && (
            <ActionsMenu
              label="Ownership entity"
              actions={[
                {
                  label: "Edit Entity Details",
                  icon: <Pencil className="h-4 w-4" />,
                  onClick: () => {
                    setEditEntityMode(true);
                    setNewEntityName(ownership!.entity!.name);
                    setNewEntityType(ownership!.entity!.entity_type || "");
                    setNewEntityEin(ownership!.entity!.ein || "");
                    setNewEntityState(ownership!.entity!.state_of_formation || "");
                  },
                },
                { label: "Remove from Property", icon: <X className="h-4 w-4" />, destructive: true, onClick: handleRemoveEntity },
              ]}
            />
          )}
        </div>

        {isIndividual ? (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              This property is owned by an individual. Assign a business entity to manage shared ownership.
            </p>
            {!showEntitySelector && !showNewEntityForm && (
              <button onClick={() => setShowEntitySelector(true)}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
                <Building2 className="h-4 w-4" /> Assign Business Entity
              </button>
            )}
          </div>
        ) : ownership?.entity && !editEntityMode ? (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Entity Name</p>
                <p className="text-sm font-medium mt-0.5">{ownership.entity.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Type</p>
                <p className="text-sm font-medium mt-0.5">{ownership.entity.entity_type || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">EIN</p>
                <p className="text-sm font-medium mt-0.5">{ownership.entity.ein || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">State of Formation</p>
                <p className="text-sm font-medium mt-0.5">{ownership.entity.state_of_formation || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Status</p>
                <p className="text-sm font-medium mt-0.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {ownership.entity.status}
                  </span>
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Inline Edit Entity Form */}
        {editEntityMode && ownership?.entity && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <h4 className="text-sm font-semibold">Edit Entity Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Entity Name</label>
                <input type="text" value={newEntityName} onChange={(e) => setNewEntityName(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Entity Type</label>
                <select value={newEntityType} onChange={(e) => setNewEntityType(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none">
                  <option value="">Select type...</option>
                  <option value="LLC">LLC</option>
                  <option value="Corporation">Corporation</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Trust">Trust</option>
                  <option value="LLP">LLP</option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">EIN</label>
                <input type="text" value={newEntityEin} onChange={(e) => setNewEntityEin(e.target.value)}
                  placeholder="XX-XXXXXXX"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">State of Formation</label>
                <input type="text" value={newEntityState} onChange={(e) => setNewEntityState(e.target.value)}
                  placeholder="e.g. Delaware"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleEditEntity} disabled={!newEntityName.trim()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                Save Changes
              </button>
              <button onClick={() => { setEditEntityMode(false); setNewEntityName(""); setNewEntityType(""); setNewEntityEin(""); setNewEntityState(""); }}
                className="rounded-md border px-3 py-2 text-sm font-medium">Cancel</button>
            </div>
          </div>
        )}

        {/* Entity Selector */}
        {showEntitySelector && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <h4 className="text-sm font-semibold">Select an existing entity</h4>
            {entities && entities.length > 0 ? (
              <div className="flex items-center gap-3">
                <select value={selectedEntityId} onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="rounded-md border bg-background px-3 py-2 text-sm outline-none flex-1 max-w-md">
                  <option value="">Choose an entity...</option>
                  {entities.map((e: EntityData) => (
                    <option key={e.id} value={e.id}>{e.name} {e.entity_type ? `(${e.entity_type})` : ""}</option>
                  ))}
                </select>
                <button onClick={handleSelectEntity} disabled={!selectedEntityId || setEntity.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {setEntity.isPending ? "Assigning..." : "Assign"}
                </button>
                <button onClick={() => setShowEntitySelector(false)}
                  className="rounded-md border px-3 py-2 text-sm font-medium">Cancel</button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No entities yet.</p>
            )}
            <div className="border-t pt-3 mt-3">
              {!showNewEntityForm ? (
                <button onClick={() => setShowNewEntityForm(true)}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Plus className="h-3.5 w-3.5" /> Create new entity
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Entity Name *</label>
                      <input type="text" value={newEntityName} onChange={(e) => setNewEntityName(e.target.value)}
                        placeholder="Entity name"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Entity Type</label>
                      <select value={newEntityType} onChange={(e) => setNewEntityType(e.target.value)}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none">
                        <option value="">Select type...</option>
                        <option value="LLC">LLC</option>
                        <option value="Corporation">Corporation</option>
                        <option value="Partnership">Partnership</option>
                        <option value="Trust">Trust</option>
                        <option value="LLP">LLP</option>
                        <option value="Sole Proprietorship">Sole Proprietorship</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">EIN</label>
                      <input type="text" value={newEntityEin} onChange={(e) => setNewEntityEin(e.target.value)}
                        placeholder="XX-XXXXXXX"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">State of Formation</label>
                      <input type="text" value={newEntityState} onChange={(e) => setNewEntityState(e.target.value)}
                        placeholder="e.g. Delaware"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={handleCreateAndAssign} disabled={!newEntityName.trim() || createEntity.isPending}
                      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                      {createEntity.isPending ? "Creating..." : "Create & Assign"}
                    </button>
                    <button onClick={() => { setShowNewEntityForm(false); setNewEntityType(""); setNewEntityEin(""); setNewEntityState(""); }}
                      className="rounded-md border px-3 py-2 text-sm font-medium">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Entity Investors */}
      {!isIndividual && ownership?.entity && (
        <InvestorsSection entityId={ownership.entity.id} investors={ownership.investors} onUpdated={() => refetch()} />
      )}

      {/* Documents */}
      {!isIndividual && ownership?.entity && (
        <DocumentsSection propertyId={id} />
      )}

      {isIndividual && (
        <div className="rounded-lg border bg-card p-6 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-sm font-semibold mb-1">Individual Ownership</h3>
          <p className="text-sm text-muted-foreground">
            This property is individually owned. Assign a business entity above to manage shared ownership and investors.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Investors Section ─── */

function InvestorsSection({
  entityId,
  investors,
  onUpdated,
}: {
  entityId: string;
  investors: { id: string; name: string; email?: string | null; phone?: string | null; ownership_percentage: number; portal_access?: boolean }[];
  onUpdated?: () => void;
}) {
  const addInvestor = useAddEntityInvestor();
  const updateInvestor = useUpdateEntityInvestor();
  const removeInvestor = useRemoveEntityInvestor();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pct, setPct] = useState("");

  const totalPct = investors.reduce((s, i) => s + i.ownership_percentage, 0);
  const remainingPct = Math.round((100 - totalPct) * 100) / 100;

  const resetForm = () => {
    setName(""); setEmail(""); setPhone(""); setPct(""); setEditId(null); setShowForm(false);
  };

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const pctVal = parseFloat(pct);
    if (isNaN(pctVal) || pctVal <= 0) { setError("Ownership percentage must be greater than 0"); return; }

    setError(null);
    try {
      if (editId) {
        await updateInvestor.mutateAsync({
          entityId,
          investorId: editId,
          data: { name: name || undefined, email: email || undefined, phone: phone || undefined, ownership_percentage: pctVal },
        });
        onUpdated?.();
      } else {
        if (pctVal > remainingPct) {
          setError(`Total ownership would exceed 100%. Remaining: ${remainingPct}%`);
          return;
        }
        await addInvestor.mutateAsync({
          entityId,
          data: { name, email: email || undefined, phone: phone || undefined, ownership_percentage: pctVal },
        });
        onUpdated?.();
      }
      resetForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save investor");
    }
  };

  const handleEdit = (inv: typeof investors[0]) => {
    setEditId(inv.id); setName(inv.name); setEmail(inv.email || ""); setPhone(inv.phone || ""); setPct(String(inv.ownership_percentage));
    setShowForm(true);
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Investors</h3>
          <span className="text-xs text-muted-foreground">
            ({totalPct.toFixed(1)}% assigned)
          </span>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add Investor
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="border-b bg-muted/20 px-5 py-4 space-y-3">
          {error && (
            <div className="rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Phone</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Ownership % *</label>
              <input type="number" step="0.01" min="0" max={editId ? 100 : remainingPct} value={pct}
                onChange={(e) => setPct(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none" />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={handleSubmit} disabled={!name.trim() || !pct}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {editId ? "Save" : "Add"}
              </button>
              <button onClick={resetForm}
                className="rounded-md border px-3 py-2 text-sm font-medium">Cancel</button>
            </div>
          </div>
          {remainingPct < 100 && (
            <p className="text-xs text-muted-foreground">
              Remaining ownership: <strong>{remainingPct}%</strong>
            </p>
          )}
        </div>
      )}

      {/* Investors List */}
      {investors.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          No investors yet. Add one to record ownership percentages.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase text-muted-foreground">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase text-muted-foreground">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase text-muted-foreground">Phone</th>
                <th className="text-center px-5 py-3 text-xs font-semibold uppercase text-muted-foreground">Portal</th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase text-muted-foreground">Ownership %</th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {investors.map((inv) => (
                <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-5 py-3 text-sm font-medium">{inv.name}</td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{inv.email || "—"}</td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{inv.phone || "—"}</td>
                  <td className="px-5 py-3 text-center">
                    {inv.portal_access ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-gray-300" /> —
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-mono font-semibold">{inv.ownership_percentage.toFixed(1)}%</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end">
                      <ActionsMenu
                        label={`${inv.name}`}
                        actions={[
                          { label: "Edit Investor", icon: <Pencil className="h-4 w-4" />, onClick: () => handleEdit(inv) },
                          {
                            label: "Remove",
                            icon: <Trash2 className="h-4 w-4" />,
                            destructive: true,
                            onClick: async () => {
                              await removeInvestor.mutateAsync({ entityId, investorId: inv.id });
                              onUpdated?.();
                            },
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {totalPct > 0 && (
              <tfoot>
                <tr className="border-t bg-muted/20">
                  <td className="px-5 py-3 text-sm font-semibold">Total</td>
                  <td colSpan={2} />
                  <td className="px-5 py-3 text-right text-sm font-mono font-bold">{totalPct.toFixed(1)}%</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {totalPct > 0 && totalPct !== 100 && (
        <div className="border-t bg-amber-50 px-5 py-2.5 text-xs text-amber-700">
          Warning: Ownership totals {totalPct.toFixed(1)}%. They should total 100%.
        </div>
      )}
    </div>
  );
}

/* ─── Documents Section ─── */

function DocumentsSection({ propertyId }: { propertyId: string }) {
  const [docs, setDocs] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/v1/properties/${propertyId}/documents`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setDocs(data.filter((d: any) => ["Certificate of Formation", "Operating Agreement", "EIN Letter", "Tax Document"].includes(d.category))))
      .catch(() => {});
  }, [propertyId]);

  const ownershipDocCategories = [
    { label: "Certificate of Formation", key: "Certificate of Formation" },
    { label: "Operating Agreement", key: "Operating Agreement" },
    { label: "EIN Letter", key: "EIN Letter" },
    { label: "Tax Documents", key: "Tax Document" },
  ];

  const handleUpload = async (category: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("file", file);
      try {
        await fetch(`/api/v1/properties/${propertyId}/documents?category=${encodeURIComponent(category)}`, {
          method: "POST", credentials: "include", body: formData,
        });
        // Refresh
        const resp = await fetch(`/api/v1/properties/${propertyId}/documents`, { credentials: "include" });
        const data = await resp.json();
        setDocs(data.filter((d: any) => ["Certificate of Formation", "Operating Agreement", "EIN Letter", "Tax Document"].includes(d.category)));
      } catch {}
    };
    input.click();
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Entity Documents</h3>
        </div>
      </div>
      <div className="divide-y">
        {ownershipDocCategories.map((cat) => {
          const doc = docs.find((d) => d.category === cat.key);
          return (
            <div key={cat.key} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium">{cat.label}</p>
                {doc ? (
                  <a href={doc.storage_key} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline">{doc.name || "View document"}</a>
                ) : (
                  <p className="text-xs text-muted-foreground">Not uploaded</p>
                )}
              </div>
              <button onClick={() => handleUpload(cat.key)}
                className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                <Plus className="h-3.5 w-3.5" />
                {doc ? "Replace" : "Upload"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
