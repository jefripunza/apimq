import type { WhitelistEntry } from "@/types/whitelist";

export const initialEntries: WhitelistEntry[] = [
  {
    id: "wl_1",
    type: "ip",
    value: "192.168.1.100",
    label: "Office server",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
  {
    id: "wl_2",
    type: "domain",
    value: "api.example.com",
    label: "Main API",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: "wl_3",
    type: "ip",
    value: "10.0.0.50",
    label: "Staging",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "wl_4",
    type: "domain",
    value: "webhook.internal.dev",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
];
