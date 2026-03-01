import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useQueueStore } from "@/stores/queueStore";
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
import type { HeaderEntry, KeyStatus, Queue } from "@/types/queue";
import { queueService, type QueueMessageApi } from "@/services/queue.service";
import { Loader2, RefreshCw } from "lucide-react";

export default function QueuePage() {
  const {
    items: queues,
    fetchAll: fetchAllQueues,
    checkKeyAvailable,
    create: createQueue,
  } = useQueueStore();

  // Failed messages state
  const [failedMessages, setFailedMessages] = useState<QueueMessageApi[]>([]);
  const [isLoadingErrors, setIsLoadingErrors] = useState(false);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAllQueues();
  }, [fetchAllQueues]);

  const [isErrorsOpen, setIsErrorsOpen] = useState(false);
  const [errorsQueue, setErrorsQueue] = useState<Queue | null>(null);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newOrigin, setNewOrigin] = useState("");
  const [newBatchCount, setNewBatchCount] = useState("1");
  const [newTimeout, setNewTimeout] = useState("30");
  const [newHeaders, setNewHeaders] = useState<HeaderEntry[]>([]);
  // Timing fields
  const [newIsSendNow, setNewIsSendNow] = useState(true);
  const [newSendLaterTime, setNewSendLaterTime] = useState("");
  // Delay fields
  const [newIsRandomDelay, setNewIsRandomDelay] = useState(false);
  const [newDelaySec, setNewDelaySec] = useState("");
  const [newDelayStart, setNewDelayStart] = useState("");
  const [newDelayEnd, setNewDelayEnd] = useState("");
  // Error trace
  const [newErrorTrace, setNewErrorTrace] = useState(false);
  const [newErrorWebhook, setNewErrorWebhook] = useState("");

  const [newKeyStatus, setNewKeyStatus] = useState<KeyStatus>("idle");
  const keyCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetNewQueueForm = () => {
    setNewName("");
    setNewKey("");
    setNewOrigin("");
    setNewBatchCount("1");
    setNewTimeout("30");
    setNewHeaders([]);
    setNewIsSendNow(true);
    setNewSendLaterTime("");
    setNewIsRandomDelay(false);
    setNewDelaySec("");
    setNewDelayStart("");
    setNewDelayEnd("");
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

    const computeNextSendLaterISO = (timeStr: string) => {
      // Expect HH:MM
      if (!timeStr || !timeStr.includes(":")) return undefined;
      const [hhStr, mmStr] = timeStr.split(":");
      const hh = Number(hhStr);
      const mm = Number(mmStr);
      if (Number.isNaN(hh) || Number.isNaN(mm)) return undefined;

      const now = new Date();
      const next = new Date(now);
      next.setSeconds(0, 0);
      next.setHours(hh, mm, 0, 0);
      if (next.getTime() <= now.getTime()) {
        next.setDate(next.getDate() + 1);
      }
      return next.toISOString();
    };

    const errorTrace: Record<string, unknown> = {};
    if (newErrorTrace) {
      errorTrace.webhook = newErrorWebhook;
    }

    const ok = await createQueue({
      name: newName,
      key: newKey,
      origin: newOrigin,
      batchCount: Number(newBatchCount || 1),
      timeout: Number(newTimeout || 30),
      headers: newHeaders
        .filter((h) => h.key.trim())
        .map((h) => ({ key: h.key.trim(), value: h.value.trim() })),
      isSendNow: newIsSendNow,
      sendLaterTime:
        !newIsSendNow && newSendLaterTime
          ? computeNextSendLaterISO(newSendLaterTime)
          : undefined,
      isRandomDelay: newIsRandomDelay,
      delaySec: !newIsRandomDelay ? Number(newDelaySec || 0) : 0,
      delayStart: newIsRandomDelay ? Number(newDelayStart || 0) : 0,
      delayEnd: newIsRandomDelay ? Number(newDelayEnd || 0) : 0,
      errorTrace,
    });

    if (!ok) return;

    setIsNewOpen(false);
    resetNewQueueForm();
  };

  const fetchFailedMessages = async (key: string) => {
    setIsLoadingErrors(true);
    try {
      const res = await queueService.getFailedMessages(key);
      if (res.status === 200 && res.data) {
        setFailedMessages(res.data);
      }
    } catch {
      setFailedMessages([]);
    } finally {
      setIsLoadingErrors(false);
    }
  };

  const handleRetryMessage = async (messageId: string) => {
    setRetryingIds((prev) => new Set(prev).add(messageId));
    try {
      const res = await queueService.retryMessage(messageId);
      if (res.status === 200) {
        setFailedMessages((prev) => prev.filter((m) => m.id !== messageId));
        fetchAllQueues();
      }
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    }
  };

  const handleRetryAll = async () => {
    const ids = failedMessages.map((m) => m.id);
    for (const id of ids) {
      await handleRetryMessage(id);
    }
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
                    Timeout (sec)<span className="text-neon-red ml-1">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newTimeout}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setNewTimeout(e.target.value)
                    }
                    className="w-full px-4 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
                    required
                  />
                </div>
              </div>

              {/* Timing Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-dark-200 font-medium">
                      Send Now
                    </p>
                    <p className="text-xs text-dark-400 font-mono">
                      Send messages immediately when added
                    </p>
                  </div>
                  <Switch
                    checked={newIsSendNow}
                    onCheckedChange={setNewIsSendNow}
                  />
                </div>

                {!newIsSendNow && (
                  <div className="pl-4 border-l-2 border-accent-500/30">
                    <label className="block text-sm font-medium text-dark-200 mb-1.5">
                      Scheduled Time
                      <span className="text-neon-red ml-1">*</span>
                    </label>
                    <input
                      type="time"
                      value={newSendLaterTime}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setNewSendLaterTime(e.target.value)
                      }
                      className="w-full px-4 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Delay Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-dark-200 font-medium">
                      Random Delay
                    </p>
                    <p className="text-xs text-dark-400 font-mono">
                      Add random delay between messages
                    </p>
                  </div>
                  <Switch
                    checked={newIsRandomDelay}
                    onCheckedChange={setNewIsRandomDelay}
                  />
                </div>

                {newIsRandomDelay ? (
                  <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-accent-500/30">
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1.5">
                        Min seconds
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={newDelayStart}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setNewDelayStart(e.target.value)
                        }
                        className="w-full px-4 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1.5">
                        Max seconds
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={newDelayEnd}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setNewDelayEnd(e.target.value)
                        }
                        className="w-full px-4 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="pl-4 border-l-2 border-accent-500/30">
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
                    />
                  </div>
                )}
              </div>

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

      {/* Failed Messages dialog */}
      <Dialog
        open={isErrorsOpen}
        onOpenChange={(open) => {
          setIsErrorsOpen(open);
          if (!open) setFailedMessages([]);
        }}
      >
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="max-h-[85vh] overflow-y-auto max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle>
              Failed Messages{errorsQueue ? ` — ${errorsQueue.name}` : ""}
            </DialogTitle>
            <DialogDescription>
              Messages that failed to deliver. You can retry or edit them.
            </DialogDescription>
          </DialogHeader>

          <div
            className={`mt-4 space-y-3 ${
              failedMessages.length > 5 ? "max-h-105 overflow-y-auto pr-2" : ""
            }`}
          >
            {isLoadingErrors ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-accent-500" />
              </div>
            ) : failedMessages.length === 0 ? (
              <div className="text-sm text-dark-300 font-mono bg-dark-900/40 border border-dark-600/30 rounded-xl p-4">
                No failed messages.
              </div>
            ) : (
              failedMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-dark-900/40 border border-dark-600/30 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono px-2 py-0.5 bg-accent-500/20 text-accent-400 rounded">
                          {msg.method}
                        </span>
                        <span className="text-[11px] font-mono text-neon-red border border-neon-red/20 bg-neon-red/10 rounded-md px-2 py-0.5">
                          failed
                        </span>
                      </div>
                      <p className="text-xs text-dark-400 font-mono">
                        {formatDate(msg.created_at)}
                      </p>
                      {msg.error_message && (
                        <p className="text-xs text-neon-red font-mono mt-2 break-all">
                          {msg.error_message}
                        </p>
                      )}
                      <details className="mt-2">
                        <summary className="text-xs text-dark-400 cursor-pointer hover:text-dark-200">
                          View body
                        </summary>
                        <pre className="text-xs text-dark-300 font-mono mt-1 p-2 bg-dark-900/60 rounded overflow-x-auto max-h-32">
                          {msg.body}
                        </pre>
                      </details>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={retryingIds.has(msg.id)}
                        onClick={() => handleRetryMessage(msg.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-accent-500 hover:bg-accent-600 disabled:opacity-50 rounded-lg transition-all flex items-center gap-1"
                      >
                        {retryingIds.has(msg.id) ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        Retry
                      </button>
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
              disabled={!errorsQueue || failedMessages.length === 0}
              onClick={handleRetryAll}
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
              fetchFailedMessages(q.key);
            }}
          />
        ))}
      </div>
    </div>
  );
}
