import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
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
import satellite from "@/lib/satellite";

type SchemaType = "" | "delay" | "timing";

interface HeaderEntry {
  id: string;
  key: string;
  value: string;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

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

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-dark-900/40 rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3 h-3 text-dark-400" />
            <p className="text-[14px] text-dark-400 font-mono">
              Messages in queue
            </p>
          </div>
          <p className="text-3xl font-bold text-foreground font-mono">
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
        <div className="flex items-center gap-1 text-xs font-mono text-neon-red cursor-pointer">
          <FileText className="w-3 h-3" />
          <span>{queue.deliverRate}</span>
          <span className="text-dark-500 ml-1 underline">error</span>
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
  const [newBatchCount, setNewBatchCount] = useState("1");
  const [newHeaders, setNewHeaders] = useState<HeaderEntry[]>([]);
  const [newSchema, setNewSchema] = useState<SchemaType>("");
  const [newDelayRandom, setNewDelayRandom] = useState(false);
  const [newDelaySec, setNewDelaySec] = useState("");
  const [newDelaySecMin, setNewDelaySecMin] = useState("");
  const [newDelaySecMax, setNewDelaySecMax] = useState("");
  const [newTimingDatetime, setNewTimingDatetime] = useState("");
  const [newErrorTrace, setNewErrorTrace] = useState(false);
  const [newErrorWebhook, setNewErrorWebhook] = useState("");

  type KeyStatus = "idle" | "checking" | "available" | "taken" | "error";
  const [newKeyStatus, setNewKeyStatus] = useState<KeyStatus>("idle");
  const keyCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetNewQueueForm = () => {
    setNewName("");
    setNewKey("");
    setNewOrigin("");
    setNewBatchCount("1");
    setNewHeaders([]);
    setNewSchema("");
    setNewDelayRandom(false);
    setNewDelaySec("");
    setNewDelaySecMin("");
    setNewDelaySecMax("");
    setNewTimingDatetime("");
    setNewErrorTrace(false);
    setNewErrorWebhook("");
    setNewKeyStatus("idle");
  };

  const handleNewKeyBlur = async () => {
    const trimmed = newKey.trim();
    if (!trimmed) {
      setNewKeyStatus("idle");
      return;
    }

    if (keyCheckTimer.current) clearTimeout(keyCheckTimer.current);
    setNewKeyStatus("checking");
    keyCheckTimer.current = setTimeout(async () => {
      try {
        const res = await satellite.get<{ available: boolean }>(
          `/api/queue/check-key?key=${encodeURIComponent(trimmed)}`,
        );
        setNewKeyStatus(res.data.available ? "available" : "taken");
      } catch {
        setNewKeyStatus("available");
      }
    }, 300);
  };

  const addNewHeader = () =>
    setNewHeaders((prev) => [...prev, { id: uid(), key: "", value: "" }]);
  const updateNewHeader = (id: string, field: "key" | "value", value: string) =>
    setNewHeaders((prev) =>
      prev.map((h) => (h.id === id ? { ...h, [field]: value } : h)),
    );
  const removeNewHeader = (id: string) =>
    setNewHeaders((prev) => prev.filter((h) => h.id !== id));

  const handleCreateNew = (e: FormEvent) => {
    e.preventDefault();
    if (newKeyStatus === "taken") return;
    setIsNewOpen(false);
    navigate("/app/queue/new/setup", {
      state: {
        prefill: {
          name: newName,
          key: newKey,
          origin: newOrigin,
          batchCount: newBatchCount,
          headers: newHeaders
            .filter((h) => h.key.trim())
            .map((h) => ({ key: h.key.trim(), value: h.value.trim() })),
          schema: newSchema,
          delayRandom: newDelayRandom,
          delaySec: newDelaySec,
          delaySecMin: newDelaySecMin,
          delaySecMax: newDelaySecMax,
          timingDatetime: newTimingDatetime,
          errorTrace: newErrorTrace,
          errorWebhook: newErrorWebhook,
        },
      },
    });
    resetNewQueueForm();
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
            className="max-h-[85vh] overflow-y-auto"
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
                <div className="relative">
                  <input
                    value={newKey}
                    onChange={(e) => {
                      setNewKey(e.target.value);
                      setNewKeyStatus("idle");
                    }}
                    onBlur={handleNewKeyBlur}
                    placeholder="unique-queue-key"
                    className={`w-full px-4 py-2.5 bg-dark-900/60 border rounded-xl text-foreground placeholder-dark-400 focus:outline-none transition-all font-mono text-sm pr-10 ${
                      newKeyStatus === "taken"
                        ? "border-neon-red/60 focus:border-neon-red/80 focus:ring-1 focus:ring-neon-red/20"
                        : newKeyStatus === "available"
                          ? "border-neon-green/60 focus:border-neon-green/80 focus:ring-1 focus:ring-neon-green/20"
                          : "border-dark-500/50 focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30"
                    }`}
                    required
                  />
                  {newKeyStatus === "checking" && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-dark-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  {newKeyStatus === "available" && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-neon-green" />
                  )}
                  {newKeyStatus === "taken" && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-neon-red" />
                  )}
                </div>
                {newKeyStatus === "taken" && (
                  <p className="text-xs text-neon-red font-mono mt-1">
                    key already taken
                  </p>
                )}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-1.5">
                    Batch Count<span className="text-neon-red ml-1">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newBatchCount}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setNewBatchCount(e.target.value)
                    }
                    className="w-full px-4 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-1.5">
                    Delivery Schema<span className="text-neon-red ml-1">*</span>
                  </label>
                  <select
                    value={newSchema}
                    onChange={(e) => {
                      setNewSchema(e.target.value as SchemaType);
                      setNewDelayRandom(false);
                      setNewDelaySec("");
                      setNewDelaySecMin("");
                      setNewDelaySecMax("");
                      setNewTimingDatetime("");
                    }}
                    className="w-full px-4 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl text-foreground focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
                    required
                  >
                    <option value="">— Select —</option>
                    <option value="delay">Delay</option>
                    <option value="timing">Timing</option>
                  </select>
                </div>
              </div>

              {newSchema === "delay" && (
                <div className="space-y-3 pl-4 border-l-2 border-accent-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-dark-200 font-medium">
                        Random delay
                      </p>
                      <p className="text-xs text-dark-400 font-mono">
                        Randomize delay seconds range
                      </p>
                    </div>
                    <Switch
                      checked={newDelayRandom}
                      onCheckedChange={setNewDelayRandom}
                    />
                  </div>

                  {newDelayRandom ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-dark-200 mb-1.5">
                          Min seconds
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={newDelaySecMin}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setNewDelaySecMin(e.target.value)
                          }
                          className="w-full px-4 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-dark-200 mb-1.5">
                          Max seconds
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={newDelaySecMax}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setNewDelaySecMax(e.target.value)
                          }
                          className="w-full px-4 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1.5">
                        Delay (seconds)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={newDelaySec}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setNewDelaySec(e.target.value)
                        }
                        className="w-full px-4 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
                        required
                      />
                    </div>
                  )}
                </div>
              )}

              {newSchema === "timing" && (
                <div className="pl-4 border-l-2 border-accent-500/30">
                  <label className="block text-sm font-medium text-dark-200 mb-1.5">
                    Scheduled Date & Time
                    <span className="text-neon-red ml-1">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={newTimingDatetime}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setNewTimingDatetime(e.target.value)
                    }
                    className="w-full px-4 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-dark-200 font-medium">Headers</p>
                    <p className="text-xs text-dark-400 font-mono">
                      Optional HTTP headers
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addNewHeader}
                    className="px-3 py-1.5 text-xs font-mono text-dark-300 hover:text-foreground border border-dashed border-dark-500/60 hover:border-dark-400/60 rounded-lg transition-all"
                  >
                    + Add
                  </button>
                </div>

                {newHeaders.length > 0 && (
                  <div className="space-y-2">
                    {newHeaders.map((h) => (
                      <div key={h.id} className="flex gap-2 items-center">
                        <input
                          value={h.key}
                          onChange={(e) =>
                            updateNewHeader(h.id, "key", e.target.value)
                          }
                          placeholder="Header-Key"
                          className="flex-1 px-4 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
                        />
                        <input
                          value={h.value}
                          onChange={(e) =>
                            updateNewHeader(h.id, "value", e.target.value)
                          }
                          placeholder="value"
                          className="flex-1 px-4 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewHeader(h.id)}
                          className="p-2 rounded-lg text-dark-400 hover:text-neon-red hover:bg-neon-red/5 transition-all shrink-0"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-dark-200 font-medium">
                      Error trace
                    </p>
                    <p className="text-xs text-dark-400 font-mono">
                      Notify webhook on delivery error
                    </p>
                  </div>
                  <Switch
                    checked={newErrorTrace}
                    onCheckedChange={setNewErrorTrace}
                  />
                </div>
                {newErrorTrace && (
                  <div>
                    <label className="block text-sm font-medium text-dark-200 mb-1.5">
                      Error webhook URL
                      <span className="text-neon-red ml-1">*</span>
                    </label>
                    <input
                      type="url"
                      value={newErrorWebhook}
                      onChange={(e) => setNewErrorWebhook(e.target.value)}
                      placeholder="https://your-service.com/error"
                      className="w-full px-4 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
                      required
                    />
                  </div>
                )}
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
                  disabled={
                    newKeyStatus === "taken" || newKeyStatus === "checking"
                  }
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
