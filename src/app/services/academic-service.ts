import type { AcademicData } from "../types/academic";

export const getAcademicData = async (): Promise<AcademicData> => {
  const response = await fetch("/api/academic", { cache: "no-store" });
  const result = await response.json() as AcademicData & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Academic data could not be loaded.");
  return result;
};

export const saveAcademicData = async (data: AcademicData): Promise<AcademicData> => {
  const response = await fetch("/api/academic", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  const result = await response.json() as AcademicData & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Academic data could not be saved.");
  return result;
};
