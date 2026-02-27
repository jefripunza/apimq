import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useDashboardStore, type QueueItem } from "@/stores/dashboardStore";
import { Plus, Activity, ArrowUpRight, FileText, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

function QueueCard({ queue }: { queue: QueueItem }) {
  const navigate = useNavigate();
  const toggleQueueEnabled = useDashboardStore((s) => s.toggleQueueEnabled);
  const isError = queue.status === "error";

  return (
    <div
      className={`
        bg-dark-800/60 border rounded-2xl p-5 flex flex-col gap-4
        hover:border-dark-500/60 transition-all duration-200 group
        ${isError ? "border-neon-red/30" : "border-dark-600/40"}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => navigate(`/app/queue/${queue.key}/setup`)}
            className="text-left w-full"
            title="Open setup"
          >
            <h3 className="text-sm font-mono font-semibold text-accent-400 truncate hover:underline">
              {queue.name}
            </h3>
          </button>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 pl-1">
            <Switch
              checked={queue.enabled}
              onCheckedChange={(checked) =>
                toggleQueueEnabled(queue.key, checked)
              }
              aria-label={queue.enabled ? "Queue enabled" : "Queue disabled"}
            />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-dark-900/40 rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3 h-3 text-dark-400" />
            <p className="text-[10px] text-dark-400 font-mono">
              Messages in queue
            </p>
          </div>
          <p className="text-base font-bold text-foreground font-mono">
            {queue.messages.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Rate row */}
      <div className="flex items-center justify-between pt-1 border-t border-dark-600/30">
        <div className="flex items-center gap-1 text-xs font-mono text-neon-green">
          <ArrowUpRight className="w-3 h-3" />
          <span>{queue.publishRate}/s</span>
          <span className="text-dark-500 ml-1">throughput</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-mono text-neon-cyan">
          <FileText className="w-3 h-3" />
          <span>{queue.deliverRate}</span>
          <span className="text-dark-500 ml-1">done</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-mono text-neon-cyan">
          <button
            onClick={() => navigate(`/app/queue/${queue.key}/setup`)}
            className="p-1.5 rounded-lg text-dark-400 hover:text-foreground hover:bg-dark-700/50 transition-all opacity-100"
            title="Configure queue"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QueuePage() {
  const { queues } = useDashboardStore();
  const navigate = useNavigate();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newOrigin, setNewOrigin] = useState("");

  const handleCreateNew = (e: FormEvent) => {
    e.preventDefault();
    setIsNewOpen(false);
    navigate("/app/queue/new/setup", {
      state: {
        prefill: {
          name: newName,
          key: newKey,
          origin: newOrigin,
        },
      },
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Queues</h2>
          <p className="text-sm text-dark-300 mt-1">
            Manage and monitor your message queues
          </p>
        </div>
        <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-accent-500/25 shrink-0">
              <Plus className="w-4 h-4" />
              <span>New Queue</span>
            </button>
          </DialogTrigger>
          <DialogContent
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Create queue</DialogTitle>
              <DialogDescription>
                Quick-add basic info. You can complete advanced settings on the
                next step.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateNew} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1.5">
                  Name<span className="text-neon-red ml-1">*</span>
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. order.processing"
                  className="w-full px-4 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1.5">
                  Key<span className="text-neon-red ml-1">*</span>
                </label>
                <input
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="unique-queue-key"
                  className="w-full px-4 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1.5">
                  Origin<span className="text-neon-red ml-1">*</span>
                </label>
                <input
                  value={newOrigin}
                  onChange={(e) => setNewOrigin(e.target.value)}
                  placeholder="https://your-service.com"
                  className="w-full px-4 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewOpen(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-dark-300 hover:text-foreground border border-dark-600/50 hover:border-dark-500/60 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-accent-500/25"
                >
                  Continue
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Queue cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {queues.map((queue) => (
          <QueueCard key={queue.name} queue={queue} />
        ))}
      </div>
    </div>
  );
}
