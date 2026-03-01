import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  useDashboardStore,
  type QueueErrorItem,
} from "@/stores/dashboardStore";
import { useQueueStore, type QueueItem } from "@/stores/queueStore";
import { Plus } from "lucide-react";
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
import { uid } from "@/utils/random";
import { formatDate } from "@/utils/datetime";
import QueueCard from "@/components/QueueCard";
import type { HeaderEntry, KeyStatus, SchemaType } from "@/types/queue";

export default function QueuePage() {
  const {
    items: queues,
    fetchAll: fetchAllQueues,
    checkKeyAvailable,
    create: createQueue,
  } = useQueueStore();

  const {
    errorsByQueue,
    ackQueueErrors,
    retryQueueErrors,
    ackQueueError,
    retryQueueError,
  } = useDashboardStore();

  useEffect(() => {
    fetchAllQueues();
  }, [fetchAllQueues]);

  const [isErrorsOpen, setIsErrorsOpen] = useState(false);
  const [errorsQueue, setErrorsQueue] = useState<QueueItem | null>(null);
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
        const available = await checkKeyAvailable(trimmed);
        setNewKeyStatus(available ? "available" : "taken");
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

  const handleCreateNew = async (e: FormEvent) => {
    e.preventDefault();
    if (newKeyStatus === "taken") return;

    const schemaConfig: Record<string, unknown> = {};
    if (newSchema === "delay") {
      if (newDelayRandom) {
        schemaConfig.random = true;
        schemaConfig.min = Number(newDelaySecMin || 0);
        schemaConfig.max = Number(newDelaySecMax || 0);
      } else {
        schemaConfig.random = false;
        schemaConfig.sec = Number(newDelaySec || 0);
      }
    }

    if (newSchema === "timing") {
      schemaConfig.datetime = newTimingDatetime;
    }

    const errorTrace: Record<string, unknown> = {};
    if (newErrorTrace) {
      errorTrace.webhook = newErrorWebhook;
    }

    const ok = await createQueue({
      name: newName,
      key: newKey,
      origin: newOrigin,
      batchCount: Number(newBatchCount || 1),
      headers: newHeaders
        .filter((h) => h.key.trim())
        .map((h) => ({ key: h.key.trim(), value: h.value.trim() })),
      schema: newSchema,
      schemaConfig,
      errorTrace,
    });

    if (!ok) return;

    setIsNewOpen(false);
    resetNewQueueForm();
  };

  const currentErrors: QueueErrorItem[] = errorsQueue
    ? (errorsByQueue[errorsQueue.key] ?? [])
    : [];

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

      {/* Errors dialog */}
      <Dialog open={isErrorsOpen} onOpenChange={setIsErrorsOpen}>
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="max-h-[85vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>
              Errors{errorsQueue ? ` — ${errorsQueue.name}` : ""}
            </DialogTitle>
            <DialogDescription>
              Collected delivery errors. Choose an action to acknowledge or
              retry.
            </DialogDescription>
          </DialogHeader>

          <div
            className={`mt-4 space-y-3 ${
              currentErrors.length > 5 ? "max-h-105 overflow-y-auto pr-2" : ""
            }`}
          >
            {currentErrors.length === 0 ? (
              <div className="text-sm text-dark-300 font-mono bg-dark-900/40 border border-dark-600/30 rounded-xl p-4">
                No collected errors.
              </div>
            ) : (
              currentErrors.map((err) => (
                <div
                  key={err.id}
                  className="bg-dark-900/40 border border-dark-600/30 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-foreground font-semibold">
                        {err.message}
                      </p>
                      <p className="text-xs text-dark-400 font-mono mt-1">
                        {formatDate(err.at)}
                      </p>
                      {err.detail && (
                        <p className="text-xs text-dark-300 font-mono mt-2 wrap-break-word">
                          {err.detail}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-[11px] font-mono text-neon-red border border-neon-red/20 bg-neon-red/10 rounded-md px-2 py-0.5">
                        error
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!errorsQueue) return;
                            ackQueueError(errorsQueue.key, err.id);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-dark-200 hover:text-foreground border border-dark-600/50 hover:border-dark-500/60 rounded-lg transition-all"
                        >
                          Ack
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!errorsQueue) return;
                            retryQueueError(errorsQueue.key, err.id);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-accent-500 hover:bg-accent-600 rounded-lg transition-all hover:shadow-lg hover:shadow-accent-500/25"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="pt-4">
            <button
              type="button"
              onClick={() => setIsErrorsOpen(false)}
              className="px-5 py-2.5 text-sm font-semibold text-dark-300 hover:text-foreground border border-dark-600/50 hover:border-dark-500/60 rounded-xl transition-all"
            >
              Close
            </button>
            <button
              type="button"
              disabled={!errorsQueue || currentErrors.length === 0}
              onClick={() => {
                if (!errorsQueue) return;
                ackQueueErrors(errorsQueue.key);
              }}
              className="px-5 py-2.5 text-sm font-semibold text-dark-200 hover:text-foreground bg-dark-700/40 hover:bg-dark-700/60 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all"
            >
              Ack All
            </button>
            <button
              type="button"
              disabled={!errorsQueue || currentErrors.length === 0}
              onClick={() => {
                if (!errorsQueue) return;
                retryQueueErrors(errorsQueue.key);
              }}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-accent-500 hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all hover:shadow-lg hover:shadow-accent-500/25"
            >
              Retry All
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Queue cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {queues.map((queue) => (
          <QueueCard
            key={queue.key}
            queue={queue}
            onOpenErrors={(q) => {
              setErrorsQueue(q);
              setIsErrorsOpen(true);
            }}
          />
        ))}
      </div>
    </div>
  );
}
