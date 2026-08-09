import type { Company, Load, Truck, DriverProfile, EquipmentType } from "@prisma/client";
import { stateDistanceMiles } from "@/lib/integrations/location";

export interface MatchBreakdown {
  equipment: number;
  deadhead: number;
  laneFit: number;
  rateFit: number;
  onTimeRate: number;
  rating: number;
}

export interface MatchResult {
  truckId: string;
  score: number;
  breakdown: MatchBreakdown;
  deadheadMiles: number | null;
  excludedReason?: string;
}

// Box-truck sizes are considered compatible with each other at partial
// credit; a semi is never substituted for a box truck and vice versa.
const EQUIPMENT_FAMILY: Record<EquipmentType, "BOX" | "SEMI" | "VAN" | "OTHER"> = {
  BOX_TRUCK_26FT: "BOX",
  NON_CDL_BOX_TRUCK: "BOX",
  CDL_BOX_TRUCK: "BOX",
  SEMI_DRY_VAN: "SEMI",
  SEMI_REEFER: "SEMI",
  SEMI_FLATBED: "SEMI",
  SPRINTER_VAN: "VAN",
  OTHER: "OTHER",
};

function equipmentScore(loadType: EquipmentType, truckType: EquipmentType): number {
  if (loadType === truckType) return 25;
  if (EQUIPMENT_FAMILY[loadType] === EQUIPMENT_FAMILY[truckType]) return 12;
  return 0;
}

function deadheadScore(miles: number | null): number {
  if (miles === null) return 8; // unknown location — neutral-ish score, not a hard fail
  if (miles <= 50) return 20;
  if (miles <= 150) return 15;
  if (miles <= 300) return 10;
  if (miles <= 600) return 5;
  return 0;
}

function laneFitScore(company: Company, load: Load): number {
  const preferredStates = (company.preferredStates as string[] | null) ?? [];
  if (preferredStates.length === 0) return 8; // no preference set — neutral
  const hit =
    preferredStates.includes(load.pickupState) || preferredStates.includes(load.deliveryState);
  return hit ? 15 : 3;
}

function rateFitScore(company: Company, load: Load): number {
  if (!company.minRate || !load.miles || load.miles === 0) return 8; // not enough data — neutral
  const rpm = load.rate / load.miles;
  if (rpm >= company.minRate) return 15;
  const ratio = rpm / company.minRate;
  return Math.max(0, Math.round(ratio * 15));
}

export function scoreTruckForLoad(
  load: Load,
  truck: Truck & { company: Company; driver: DriverProfile | null }
): MatchResult {
  if (truck.status !== "AVAILABLE") {
    return {
      truckId: truck.id,
      score: 0,
      breakdown: { equipment: 0, deadhead: 0, laneFit: 0, rateFit: 0, onTimeRate: 0, rating: 0 },
      deadheadMiles: null,
      excludedReason: `Truck is ${truck.status.toLowerCase().replace("_", " ")}`,
    };
  }

  const deadheadMiles = stateDistanceMiles(
    truck.currentState ?? truck.homeState,
    load.pickupState
  );

  const breakdown: MatchBreakdown = {
    equipment: equipmentScore(load.equipmentType, truck.equipmentType),
    deadhead: deadheadScore(deadheadMiles),
    laneFit: laneFitScore(truck.company, load),
    rateFit: rateFitScore(truck.company, load),
    onTimeRate: Math.round((truck.onTimeDeliveryRate ?? 0.85) * 10),
    rating: Math.round(((truck.avgRating ?? 4) / 5) * 5),
  };

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);

  return { truckId: truck.id, score: Math.min(100, score), breakdown, deadheadMiles };
}

/** Ranks all candidate trucks for a load, best match first. */
export function rankTrucksForLoad(
  load: Load,
  trucks: (Truck & { company: Company; driver: DriverProfile | null })[]
): MatchResult[] {
  return trucks
    .map((t) => scoreTruckForLoad(load, t))
    .sort((a, b) => b.score - a.score);
}
