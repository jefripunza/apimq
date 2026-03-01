export interface WhitelistEntry {
  id: string;
  type: "ip" | "domain";
  value: string;
  label?: string;
  createdAt: string;
}
