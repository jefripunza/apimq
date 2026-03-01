import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Key,
  Copy,
  Check,
  Search,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate } from "@/utils/datetime";
import { useApiKeyStore } from "@/stores/apikeyStore";

export default function ApiKeyPage() {
  const { keys, isLoading, fetchAll, addKey, toggleKey, removeKey } =
    useApiKeyStore();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filtered = keys.filter((k) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return k.name.toLowerCase().includes(q) || k.key.toLowerCase().includes(q);
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const ok = await addKey({ name: newName.trim() });
    setIsSaving(false);
    if (ok) {
      setNewName("");
      setIsAddOpen(false);
    }
  };

  const handleCopy = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggle = async (id: string, current: boolean) => {
    await toggleKey(id, !current);
  };

  const handleRemove = async () => {
    if (!deleteTarget) return;
    await removeKey(deleteTarget);
    setDeleteTarget(null);
  };

  const deleteKey = keys.find((k) => k.id === deleteTarget);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">API Keys</h2>
          <p className="text-sm text-dark-300 mt-1">
            Manage API keys for accessing the queue endpoint
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-accent-500/25 shrink-0">
              <Plus className="w-4 h-4" />
              <span>Create Key</span>
            </button>
          </DialogTrigger>
          <DialogContent
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Generate a new API key for accessing the queue endpoint.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1.5">
                  Name<span className="text-neon-red ml-1">*</span>
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Production Server"
                  className="w-full px-4 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
                  required
                  autoFocus
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
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-accent-500/25"
                >
                  {isSaving ? "Creating..." : "Create"}
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
          placeholder="Search by name or key..."
          className="w-full pl-10 pr-4 py-2.5 bg-dark-800/60 border border-dark-600/40 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
        />
      </div>

      {/* Keys list */}
      <div className="space-y-2">
        {isLoading && keys.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-dark-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-dark-300 font-mono bg-dark-800/40 border border-dark-600/30 rounded-xl p-6 text-center">
            {keys.length === 0
              ? "No API keys created. All requests are allowed."
              : "No matching keys found."}
          </div>
        ) : (
          filtered.map((apiKey) => (
            <div
              key={apiKey.id}
              className="bg-dark-800/60 border border-dark-600/40 rounded-xl p-4 hover:border-dark-500/50 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-0.5">
                  <Key className="w-4 h-4 text-accent-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">
                      {apiKey.name}
                    </span>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-md border ${
                        apiKey.is_active
                          ? "text-neon-green bg-neon-green/10 border-neon-green/20"
                          : "text-dark-400 bg-dark-600/20 border-dark-600/30"
                      }`}
                    >
                      {apiKey.is_active ? "active" : "disabled"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <code className="text-xs text-dark-300 font-mono bg-dark-900/40 px-2 py-1 rounded break-all">
                      {apiKey.key}
                    </code>
                    <button
                      onClick={() => handleCopy(apiKey.key, apiKey.id)}
                      className="p-1.5 rounded-lg text-dark-400 hover:text-accent-400 hover:bg-accent-500/10 transition-all shrink-0"
                      title="Copy key"
                    >
                      {copiedId === apiKey.id ? (
                        <Check className="w-3.5 h-3.5 text-neon-green" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-dark-400 font-mono">
                    <span>Created: {formatDate(apiKey.created_at)}</span>
                    {apiKey.last_used && (
                      <span>Last used: {formatDate(apiKey.last_used)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(apiKey.id, apiKey.is_active)}
                    className="p-2 rounded-lg text-dark-400 hover:text-foreground hover:bg-dark-700/50 transition-all"
                    title={apiKey.is_active ? "Disable" : "Enable"}
                  >
                    {apiKey.is_active ? (
                      <ToggleRight className="w-5 h-5 text-neon-green" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(apiKey.id)}
                    className="p-2 rounded-lg text-dark-400 hover:text-neon-red hover:bg-neon-red/5 transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Delete API key?</DialogTitle>
            <DialogDescription>
              {deleteKey
                ? `This will permanently delete "${deleteKey.name}". Any services using this key will lose access immediately.`
                : "This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="px-5 py-2.5 text-sm font-semibold text-dark-300 hover:text-foreground border border-dark-600/50 hover:border-dark-500/60 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="px-6 py-2.5 bg-neon-red/80 hover:bg-neon-red text-white text-sm font-semibold rounded-xl transition-all"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
