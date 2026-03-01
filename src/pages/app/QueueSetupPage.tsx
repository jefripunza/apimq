import { useEffect, useState, useCallback, type ChangeEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { uid } from "@/utils/random";
import type { HeaderEntry, KeyStatus } from "@/types/queue";
import SectionTitle from "@/components/SectionTitle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQueueStore } from "@/stores/queueStore";

export default function QueueSetupPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id && id !== "new";

  const {
    items: queues,
    fetchByKey,
    update: updateQueue,
    remove: removeQueue,
  } = useQueueStore();

  // basic fields
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [origin, setOrigin] = useState("");

  // key check state
  const [keyStatus, setKeyStatus] = useState<KeyStatus>("idle");

  // delete
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // headers
  const [headers, setHeaders] = useState<HeaderEntry[]>([]);

  // batch/timeout
  const [batchCount, setBatchCount] = useState("1");
  const [timeout, setTimeout] = useState("30");
  // timing fields
  const [isSendNow, setIsSendNow] = useState(true);
  const [sendLaterTime, setSendLaterTime] = useState("");
  // delay fields
  const [isRandomDelay, setIsRandomDelay] = useState(false);
  const [delaySec, setDelaySec] = useState("");
  const [delayStart, setDelayStart] = useState("");
  const [delayEnd, setDelayEnd] = useState("");

  // error trace
  const [errorTrace, setErrorTrace] = useState(false);
  const [errorWebhook, setErrorWebhook] = useState("");

  // submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (isEdit) return;
    navigate("/app/queues", { replace: true });
  }, [isEdit, navigate]);

  useEffect(() => {
    const prefill = (
      location.state as {
        prefill?: {
          name?: string;
          key?: string;
          origin?: string;
          batchCount?: string;
          timeout?: string;
          headers?: Array<{ key: string; value: string }>;
          isSendNow?: boolean;
          sendLaterTime?: string;
          isRandomDelay?: boolean;
          delaySec?: string;
          delayStart?: string;
          delayEnd?: string;
          errorTrace?: boolean;
          errorWebhook?: string;
        };
      } | null
    )?.prefill;
    if (!prefill) return;

    if (typeof prefill.name === "string") setName(prefill.name);
    if (typeof prefill.key === "string") setKey(prefill.key);
    if (typeof prefill.origin === "string") setOrigin(prefill.origin);

    if (typeof prefill.batchCount === "string")
      setBatchCount(prefill.batchCount);

    if (typeof prefill.timeout === "string") setTimeout(prefill.timeout);

    if (Array.isArray(prefill.headers)) {
      setHeaders(
        prefill.headers.map((h) => ({
          id: uid(),
          key: h.key ?? "",
          value: h.value ?? "",
        })),
      );
    }

    if (typeof prefill.isSendNow === "boolean") setIsSendNow(prefill.isSendNow);
    if (typeof prefill.sendLaterTime === "string")
      setSendLaterTime(prefill.sendLaterTime);
    if (typeof prefill.isRandomDelay === "boolean")
      setIsRandomDelay(prefill.isRandomDelay);
    if (typeof prefill.delaySec === "string") setDelaySec(prefill.delaySec);
    if (typeof prefill.delayStart === "string")
      setDelayStart(prefill.delayStart);
    if (typeof prefill.delayEnd === "string") setDelayEnd(prefill.delayEnd);

    if (typeof prefill.errorTrace === "boolean")
      setErrorTrace(prefill.errorTrace);
    if (typeof prefill.errorWebhook === "string")
      setErrorWebhook(prefill.errorWebhook);
  }, [location.state]);

  useEffect(() => {
    if (!isEdit || !id) return;

    const existing = queues.find((q) => q.key === id);
    if (existing) {
      setName(existing.name ?? "");
      setKey(existing.key ?? "");
      setOrigin(existing.origin ?? "");
      setBatchCount(String(existing.batchCount ?? 1));
      setTimeout(String(existing.timeout ?? 30));
      setHeaders(
        (existing.headers ?? []).map((h) => ({
          id: uid(),
          key: h.key ?? "",
          value: h.value ?? "",
        })),
      );

      // Load new explicit fields
      setIsSendNow(existing.isSendNow ?? true);
      if (existing.sendLaterTime) {
        const d = new Date(existing.sendLaterTime);
        if (!Number.isNaN(d.getTime())) {
          const hh = String(d.getHours()).padStart(2, "0");
          const mm = String(d.getMinutes()).padStart(2, "0");
          setSendLaterTime(`${hh}:${mm}`);
        }
      }
      setIsRandomDelay(existing.isRandomDelay ?? false);
      setDelaySec(String(existing.delaySec ?? ""));
      setDelayStart(String(existing.delayStart ?? ""));
      setDelayEnd(String(existing.delayEnd ?? ""));

      const et = existing.errorTrace ?? {};
      const webhook = String((et as { webhook?: unknown }).webhook ?? "");
      setErrorTrace(Boolean(webhook));
      setErrorWebhook(webhook);
      return;
    }

    // fallback: fetch from API
    fetchByKey(id).then((q) => {
      if (!q) return;
      setName(q.name ?? "");
      setKey(q.key ?? "");
      setOrigin(q.origin ?? "");
      setBatchCount(String(q.batchCount ?? 1));
      setTimeout(String(q.timeout ?? 30));
      setHeaders(
        (q.headers ?? []).map((h) => ({
          id: uid(),
          key: h.key ?? "",
          value: h.value ?? "",
        })),
      );

      // Load new explicit fields
      setIsSendNow(q.isSendNow ?? true);
      if (q.sendLaterTime) {
        const d = new Date(q.sendLaterTime);
        if (!Number.isNaN(d.getTime())) {
          const hh = String(d.getHours()).padStart(2, "0");
          const mm = String(d.getMinutes()).padStart(2, "0");
          setSendLaterTime(`${hh}:${mm}`);
        }
      }
      setIsRandomDelay(q.isRandomDelay ?? false);
      setDelaySec(String(q.delaySec ?? ""));
      setDelayStart(String(q.delayStart ?? ""));
      setDelayEnd(String(q.delayEnd ?? ""));

      const et = q.errorTrace ?? {};
      const webhook = String((et as { webhook?: unknown }).webhook ?? "");
      setErrorTrace(Boolean(webhook));
      setErrorWebhook(webhook);
    });
  }, [fetchByKey, id, isEdit, queues]);

  // ---- key check on blur ----
  const handleKeyBlur = useCallback(async () => {
    setKeyStatus("idle");
  }, []);

  // ---- headers ----
  const addHeader = () =>
    setHeaders((prev) => [...prev, { id: uid(), key: "", value: "" }]);

  const updateHeader = (id: string, field: "key" | "value", val: string) =>
    setHeaders((prev) =>
      prev.map((h) => (h.id === id ? { ...h, [field]: val } : h)),
    );

  const removeHeader = (id: string) =>
    setHeaders((prev) => prev.filter((h) => h.id !== id));

  // ---- submit ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEdit || !id) return;
    setSubmitError("");
    setIsSubmitting(true);
    try {
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

      const errorTracePayload: Record<string, unknown> = {};
      if (errorTrace) {
        errorTracePayload.webhook = errorWebhook.trim();
      }

      const basePayload = {
        name: name.trim(),
        origin: origin.trim(),
        batchCount: Number(batchCount) || 1,
        timeout: Number(timeout) || 30,
        headers: headers
          .filter((h) => h.key.trim())
          .map((h) => ({ key: h.key.trim(), value: h.value.trim() })),
        isSendNow,
        sendLaterTime:
          !isSendNow && sendLaterTime
            ? computeNextSendLaterISO(sendLaterTime)
            : undefined,
        isRandomDelay,
        delaySec: !isRandomDelay ? Number(delaySec || 0) : 0,
        delayStart: isRandomDelay ? Number(delayStart || 0) : 0,
        delayEnd: isRandomDelay ? Number(delayEnd || 0) : 0,
        errorTrace: errorTracePayload,
      };

      const ok = await updateQueue(id, basePayload);

      if (!ok) {
        setSubmitError("Failed to save queue. Please try again.");
        return;
      }

      navigate("/app/queues");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to save queue. Please try again.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || !id) return;
    setIsDeleting(true);
    setSubmitError("");
    try {
      const ok = await removeQueue(id);
      if (!ok) {
        setSubmitError("Failed to delete queue. Please try again.");
        return;
      }
      setIsDeleteOpen(false);
      navigate("/app/queues");
    } finally {
      setIsDeleting(false);
    }
  };

  // ---- key status UI ----
  const keyStatusUI = {
    idle: null,
    checking: (
      <div className="flex items-center gap-1.5 text-xs text-dark-400 font-mono mt-1.5 animate-pulse">
        <Loader2 className="w-3 h-3 animate-spin" />
        checking availability...
      </div>
    ),
    available: (
      <div className="flex items-center gap-1.5 text-xs text-neon-green font-mono mt-1.5">
        <CheckCircle2 className="w-3 h-3" />
        key is available
      </div>
    ),
    taken: (
      <div className="flex items-center gap-1.5 text-xs text-neon-red font-mono mt-1.5">
        <XCircle className="w-3 h-3" />
        key already taken
      </div>
    ),
    error: (
      <div className="flex items-center gap-1.5 text-xs text-neon-yellow font-mono mt-1.5">
        <AlertCircle className="w-3 h-3" />
        could not verify key
      </div>
    ),
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl text-dark-400 hover:text-foreground hover:bg-dark-700/50 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {isEdit ? "Edit Queue" : "New Queue"}
          </h2>
          <p className="text-sm text-dark-300 mt-0.5">
            {isEdit
              ? `Editing configuration for queue "${id}"`
              : "Configure a new message queue"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-dark-800/60 border border-dark-600/40 rounded-2xl p-6 space-y-5">
          <SectionTitle>Basic Info</SectionTitle>

          {/* Name */}
          <div>
            <Label required>Name</Label>
            <Input
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
              placeholder="e.g. order.processing"
              required
            />
          </div>

          {/* Key */}
          <div>
            <Label required>Key</Label>
            <div className="relative">
              <Input
                value={key}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setKey(e.target.value);
                  setKeyStatus("idle");
                }}
                onBlur={handleKeyBlur}
                placeholder="unique-queue-key"
                disabled={isEdit}
                className={
                  keyStatus === "taken"
                    ? "border-neon-red/60 focus:border-neon-red/80"
                    : keyStatus === "available"
                      ? "border-neon-green/60 focus:border-neon-green/80"
                      : ""
                }
                required
              />
              {keyStatus === "checking" && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400 animate-spin" />
              )}
              {keyStatus === "available" && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neon-green" />
              )}
              {keyStatus === "taken" && (
                <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neon-red" />
              )}
            </div>
            {keyStatusUI[keyStatus]}
            <p className="text-[11px] text-dark-400 font-mono mt-1">
              Must be unique across all queues. Leave blank to auto-generate.
            </p>
          </div>

          {/* Origin */}
          <div>
            <Label required>Origin</Label>
            <Input
              value={origin}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setOrigin(e.target.value)
              }
              placeholder="https://your-service.com"
              required
            />
            <p className="text-[11px] text-dark-400 font-mono mt-1">
              Destination URL where messages will be delivered.
            </p>
          </div>
        </div>

        {/* Headers */}
        <div className="bg-dark-800/60 border border-dark-600/40 rounded-2xl p-6 space-y-4">
          <SectionTitle>Headers</SectionTitle>
          <p className="text-xs text-dark-400 font-mono -mt-2">
            Optional HTTP headers sent with each delivery request.
          </p>

          {headers.length > 0 && (
            <div className="space-y-2">
              {headers.map((h) => (
                <div key={h.id} className="flex gap-2 items-center">
                  <Input
                    value={h.key}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      updateHeader(h.id, "key", e.target.value)
                    }
                    placeholder="Header-Key"
                    className="flex-1"
                  />
                  <Input
                    value={h.value}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      updateHeader(h.id, "value", e.target.value)
                    }
                    placeholder="value"
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeHeader(h.id)}
                    className="p-2 rounded-lg text-dark-400 hover:text-neon-red hover:bg-neon-red/5 transition-all shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addHeader}
            className="flex items-center gap-2 px-3 py-2 text-sm font-mono text-dark-300 hover:text-foreground border border-dashed border-dark-500/60 hover:border-dark-400/60 rounded-xl transition-all w-full justify-center"
          >
            <Plus className="w-4 h-4" />
            Add Header
          </button>
        </div>

        {/* Batch */}
        <div className="bg-dark-800/60 border border-dark-600/40 rounded-2xl p-6 space-y-4">
          <SectionTitle>Batch</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label required>Batch Count</Label>
              <Input
                type="number"
                min={1}
                value={batchCount}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setBatchCount(e.target.value)
                }
                placeholder="1"
                required
              />
              <p className="text-[11px] text-dark-400 font-mono mt-1">
                Number of messages to deliver per run.
              </p>
            </div>

            <div>
              <Label required>Timeout (sec)</Label>
              <Input
                type="number"
                min={1}
                value={timeout}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setTimeout(e.target.value)
                }
                placeholder="30"
                required
              />
              <p className="text-[11px] text-dark-400 font-mono mt-1">
                HTTP request timeout.
              </p>
            </div>
          </div>
        </div>

        {/* Timing & Delay */}
        <div className="bg-dark-800/60 border border-dark-600/40 rounded-2xl p-6 space-y-4">
          <SectionTitle>Timing & Delay</SectionTitle>

          {/* Timing Section */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isSendNow}
                  onChange={(e) => setIsSendNow(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-dark-600 peer-checked:bg-accent-500 rounded-full transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
              </div>
              <div>
                <p className="text-sm text-dark-200 font-medium">Send Now</p>
                <p className="text-xs text-dark-400 font-mono">
                  Send messages immediately when added
                </p>
              </div>
            </label>

            {!isSendNow && (
              <div className="pl-4 border-l-2 border-accent-500/30">
                <Label required>Scheduled Time</Label>
                <Input
                  type="time"
                  value={sendLaterTime}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSendLaterTime(e.target.value)
                  }
                  required
                />
                <p className="text-[11px] text-dark-400 font-mono mt-1">
                  Messages will be delivered at this time.
                </p>
              </div>
            )}
          </div>

          {/* Delay Section */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isRandomDelay}
                  onChange={(e) => setIsRandomDelay(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-dark-600 peer-checked:bg-accent-500 rounded-full transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
              </div>
              <div>
                <p className="text-sm text-dark-200 font-medium">
                  Random Delay
                </p>
                <p className="text-xs text-dark-400 font-mono">
                  Add random delay between messages
                </p>
              </div>
            </label>

            {isRandomDelay ? (
              <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-accent-500/30">
                <div>
                  <Label>Min seconds</Label>
                  <Input
                    type="number"
                    min={0}
                    value={delayStart}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setDelayStart(e.target.value)
                    }
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label>Max seconds</Label>
                  <Input
                    type="number"
                    min={0}
                    value={delayEnd}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setDelayEnd(e.target.value)
                    }
                    placeholder="60"
                  />
                </div>
              </div>
            ) : (
              <div className="pl-4 border-l-2 border-accent-500/30">
                <Label>Delay (seconds)</Label>
                <Input
                  type="number"
                  min={0}
                  value={delaySec}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setDelaySec(e.target.value)
                  }
                  placeholder="0"
                />
              </div>
            )}
          </div>
        </div>

        {/* Error Trace */}
        <div className="bg-dark-800/60 border border-dark-600/40 rounded-2xl p-6 space-y-4">
          <SectionTitle>Error Handling</SectionTitle>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={errorTrace}
                onChange={(e) => setErrorTrace(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-dark-600 peer-checked:bg-accent-500 rounded-full transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
            </div>
            <div>
              <p className="text-sm text-dark-200 font-medium">Error trace</p>
              <p className="text-xs text-dark-400 font-mono">
                Notify a webhook when a delivery request fails.
              </p>
            </div>
          </label>

          {errorTrace && (
            <div className="pl-4 border-l-2 border-neon-red/30">
              <Label required>Error webhook URL</Label>
              <Input
                type="url"
                value={errorWebhook}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setErrorWebhook(e.target.value)
                }
                placeholder="https://your-service.com/error-handler"
                required
              />
            </div>
          )}
        </div>

        {/* Submit error */}
        {submitError && (
          <div className="flex items-start gap-2 bg-neon-red/10 border border-neon-red/20 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-neon-red shrink-0 mt-0.5" />
            <p className="text-sm text-neon-red font-mono">{submitError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end pb-6">
          {isEdit && (
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="mr-auto flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-neon-red border border-neon-red/30 hover:border-neon-red/50 hover:bg-neon-red/5 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete queue?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete
                    the queue <span className="font-mono">{id}</span>.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDeleteOpen(false)}
                    className="px-5 py-2.5 text-sm font-semibold text-dark-300 hover:text-foreground border border-dark-600/50 hover:border-dark-500/60 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-neon-red/80 hover:bg-neon-red disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete"
                    )}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 text-sm font-semibold text-dark-300 hover:text-foreground border border-dark-600/50 hover:border-dark-500/60 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || keyStatus === "taken"}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent-500 hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-accent-500/25"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>Save Changes</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
