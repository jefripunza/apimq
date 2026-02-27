import { useState } from "react";
import { Plus, Trash2, Shield, Globe, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface WhitelistEntry {
  id: string;
  type: "ip" | "domain";
  value: string;
  label?: string;
  createdAt: string;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const initialEntries: WhitelistEntry[] = [
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}

export default function WhitelistPage() {
  const [entries, setEntries] = useState<WhitelistEntry[]>(initialEntries);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newType, setNewType] = useState<"ip" | "domain">("ip");
  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const filtered = entries.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.value.toLowerCase().includes(q) ||
      (e.label?.toLowerCase().includes(q) ?? false)
    );
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setEntries((prev) => [
      {
        id: uid(),
        type: newType,
        value: newValue.trim(),
        label: newLabel.trim() || undefined,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setNewValue("");
    setNewLabel("");
    setNewType("ip");
    setIsAddOpen(false);
  };

  const handleRemove = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Whitelist</h2>
          <p className="text-sm text-dark-300 mt-1">
            Manage allowed IPs and domains for API access
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-accent-500/25 shrink-0">
              <Plus className="w-4 h-4" />
              <span>Add Entry</span>
            </button>
          </DialogTrigger>
          <DialogContent
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Add whitelist entry</DialogTitle>
              <DialogDescription>
                Allow an IP address or domain to access the API.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1.5">
                  Type<span className="text-neon-red ml-1">*</span>
                </label>
                <select
                  value={newType}
                  onChange={(e) =>
                    setNewType(e.target.value as "ip" | "domain")
                  }
                  className="w-full px-4 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl text-foreground focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
                >
                  <option value="ip">IP Address</option>
                  <option value="domain">Domain</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1.5">
                  {newType === "ip" ? "IP Address" : "Domain"}
                  <span className="text-neon-red ml-1">*</span>
                </label>
                <input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder={
                    newType === "ip" ? "192.168.1.100" : "api.example.com"
                  }
                  className="w-full px-4 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1.5">
                  Label
                </label>
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-4 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
                />
              </div>
              <DialogFooter className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-dark-300 hover:text-foreground border border-dark-600/50 hover:border-dark-500/60 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-accent-500/25"
                >
                  Add
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search IP or domain..."
          className="w-full pl-10 pr-4 py-2.5 bg-dark-800/60 border border-dark-600/40 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
        />
      </div>

      {/* Entries list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-sm text-dark-300 font-mono bg-dark-800/40 border border-dark-600/30 rounded-xl p-6 text-center">
            No whitelist entries found.
          </div>
        ) : (
          filtered.map((entry) => (
            <div
              key={entry.id}
              className="bg-dark-800/60 border border-dark-600/40 rounded-xl p-4 hover:border-dark-500/50 transition-all flex items-center gap-4"
            >
              <div className="shrink-0">
                {entry.type === "ip" ? (
                  <Shield className="w-4 h-4 text-neon-cyan" />
                ) : (
                  <Globe className="w-4 h-4 text-accent-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-semibold text-foreground">
                    {entry.value}
                  </span>
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-md border ${
                      entry.type === "ip"
                        ? "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20"
                        : "text-accent-400 bg-accent-500/10 border-accent-500/20"
                    }`}
                  >
                    {entry.type}
                  </span>
                </div>
                {entry.label && (
                  <p className="text-xs text-dark-300 mt-0.5">{entry.label}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-dark-400 font-mono">
                  {formatDate(entry.createdAt)}
                </p>
              </div>
              <button
                onClick={() => handleRemove(entry.id)}
                className="p-2 rounded-lg text-dark-400 hover:text-neon-red hover:bg-neon-red/5 transition-all shrink-0"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
