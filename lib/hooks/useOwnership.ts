"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPropertyOwnership,
  fetchEntities,
  fetchEntity,
  fetchEntityInvestors,
  createEntity,
  updateEntity,
  addEntityInvestor,
  updateEntityInvestor,
  removeEntityInvestor,
  setPropertyEntity,
  removePropertyEntity,
  type PropertyOwnership,
  type EntityData,
  type EntityInvestor,
  type EntityCreateData,
  type EntityUpdateData,
  type InvestorAddData,
  type InvestorUpdateData,
} from "@/lib/api/ownership";

export function usePropertyOwnership(propertyId: string) {
  return useQuery<PropertyOwnership>({
    queryKey: ["ownership", "property", propertyId],
    queryFn: () => fetchPropertyOwnership(propertyId),
    enabled: !!propertyId,
  });
}

export function useEntities() {
  return useQuery<EntityData[]>({
    queryKey: ["ownership", "entities"],
    queryFn: fetchEntities,
  });
}

export function useEntity(entityId?: string) {
  return useQuery<EntityData>({
    queryKey: ["ownership", "entity", entityId],
    queryFn: () => fetchEntity(entityId!),
    enabled: !!entityId,
  });
}

export function useEntityInvestors(entityId?: string) {
  return useQuery<EntityInvestor[]>({
    queryKey: ["ownership", "entity", entityId, "investors"],
    queryFn: () => fetchEntityInvestors(entityId!),
    enabled: !!entityId,
  });
}

export function useCreateEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EntityCreateData) => createEntity(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ownership", "entities"] });
    },
  });
}

export function useUpdateEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EntityUpdateData }) => updateEntity(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ownership", "entities"] });
      qc.invalidateQueries({ queryKey: ["ownership", "property"] });
    },
  });
}

export function useAddEntityInvestor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entityId, data }: { entityId: string; data: InvestorAddData }) =>
      addEntityInvestor(entityId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["ownership", "entity", vars.entityId, "investors"] });
      qc.invalidateQueries({ queryKey: ["ownership", "property"] });
    },
  });
}

export function useUpdateEntityInvestor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      entityId,
      investorId,
      data,
    }: {
      entityId: string;
      investorId: string;
      data: InvestorUpdateData;
    }) => updateEntityInvestor(entityId, investorId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["ownership", "entity", vars.entityId, "investors"] });
      qc.invalidateQueries({ queryKey: ["ownership", "property"] });
    },
  });
}

export function useRemoveEntityInvestor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      entityId,
      investorId,
    }: {
      entityId: string;
      investorId: string;
    }) => removeEntityInvestor(entityId, investorId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["ownership", "entity", vars.entityId, "investors"] });
      qc.invalidateQueries({ queryKey: ["ownership", "property"] });
    },
  });
}

export function useSetPropertyEntity(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entityId: string) => setPropertyEntity(propertyId, entityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ownership", "property", propertyId] });
      qc.invalidateQueries({ queryKey: ["ownership", "entities"] });
    },
  });
}

export function useRemovePropertyEntity(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => removePropertyEntity(propertyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ownership", "property", propertyId] });
    },
  });
}
