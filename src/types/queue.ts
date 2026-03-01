export type SchemaType = "" | "delay" | "timing";

export interface HeaderEntry {
  id: string;
  key: string;
  value: string;
}

export type KeyStatus = "idle" | "checking" | "available" | "taken" | "error";
