import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { ArrowLeft, Trash2, Loader2, AlertCircle } from "lucide-react";
import { uid } from "@/utils/random";
import type { HeaderEntry, KeyStatus } from "@/types/queue";
import QueueFormFields from "@/components/QueueFormFields";
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
    fetchById,
    update: updateQueue,
    remove: removeQueue,
  } = useQueueStore();

  // basic fields
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [origin, setOrigin] = useState("");
  const [color, setColor] = useState("#6366f1");

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
  const [isUseDelay, setIsUseDelay] = useState(true);
  const [isRandomDelay, setIsRandomDelay] = useState(false);
  const [delaySec, setDelaySec] = useState("");
  const [delayStart, setDelayStart] = useState("");
  const [delayEnd, setDelayEnd] = useState("");
  const [isWaitResponse, setIsWaitResponse] = useState(true);

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
          color?: string;
          batchCount?: string;
          timeout?: string;
          headers?: Array<{ key: string; value: string }>;
          isSendNow?: boolean;
          sendLaterTime?: string;
          isUseDelay?: boolean;
          isRandomDelay?: boolean;
          delaySec?: string;
          delayStart?: string;
          delayEnd?: string;
          isWaitResponse?: boolean;
          errorTrace?: boolean;
          errorWebhook?: string;
        };
      } | null
    )?.prefill;
    if (!prefill) return;

    if (typeof prefill.name === "string") setName(prefill.name);
    if (typeof prefill.key === "string") setKey(prefill.key);
    if (typeof prefill.origin === "string") setOrigin(prefill.origin);
    if (typeof prefill.color === "string") setColor(prefill.color);

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
    if (typeof prefill.isUseDelay === "boolean")
      setIsUseDelay(prefill.isUseDelay);
    if (typeof prefill.isRandomDelay === "boolean")
      setIsRandomDelay(prefill.isRandomDelay);
    if (typeof prefill.delaySec === "string") setDelaySec(prefill.delaySec);
    if (typeof prefill.delayStart === "string")
      setDelayStart(prefill.delayStart);
    if (typeof prefill.delayEnd === "string") setDelayEnd(prefill.delayEnd);
    if (typeof prefill.isWaitResponse === "boolean")
      setIsWaitResponse(prefill.isWaitResponse);

    if (typeof prefill.errorTrace === "boolean")
      setErrorTrace(prefill.errorTrace);
    if (typeof prefill.errorWebhook === "string")
      setErrorWebhook(prefill.errorWebhook);
  }, [location.state]);

  useEffect(() => {
    if (!isEdit || !id) return;

    const existing = queues.find((q) => q.id === id);
    if (existing) {
      setName(existing.name ?? "");
      setKey(existing.key ?? "");
      setOrigin(existing.origin ?? "");
      setColor(existing.color ?? "#6366f1");
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
      setIsUseDelay(existing.isUseDelay ?? true);
      setIsRandomDelay(existing.isRandomDelay ?? false);
      setDelaySec(String(existing.delaySec ?? ""));
      setDelayStart(String(existing.delayStart ?? ""));
      setDelayEnd(String(existing.delayEnd ?? ""));
      setIsWaitResponse(existing.isWaitResponse ?? true);

      const et = existing.errorTrace ?? {};
      const webhook = String((et as { webhook?: unknown }).webhook ?? "");
      setErrorTrace(Boolean(webhook));
      setErrorWebhook(webhook);
      return;
    }

    // fallback: fetch from API
    fetchById(id).then((q) => {
      if (!q) return;
      setName(q.name ?? "");
      setKey(q.key ?? "");
      setOrigin(q.origin ?? "");
      setColor(q.color ?? "#6366f1");
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
      setIsUseDelay(q.isUseDelay ?? true);
      setIsRandomDelay(q.isRandomDelay ?? false);
      setDelaySec(String(q.delaySec ?? ""));
      setDelayStart(String(q.delayStart ?? ""));
      setDelayEnd(String(q.delayEnd ?? ""));
      setIsWaitResponse(q.isWaitResponse ?? true);

      const et = q.errorTrace ?? {};
      const webhook = String((et as { webhook?: unknown }).webhook ?? "");
      setErrorTrace(Boolean(webhook));
      setErrorWebhook(webhook);
    });
  }, [fetchById, id, isEdit, queues]);

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
        color,
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
        isUseDelay,
        isRandomDelay,
        delaySec: !isRandomDelay ? Number(delaySec || 0) : 0,
        delayStart: isRandomDelay ? Number(delayStart || 0) : 0,
        delayEnd: isRandomDelay ? Number(delayEnd || 0) : 0,
        isWaitResponse,
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
        <QueueFormFields
          variant="page"
          name={name}
          keyValue={key}
          origin={origin}
          color={color}
          batchCount={batchCount}
          timeout={timeout}
          isSendNow={isSendNow}
          sendLaterTime={sendLaterTime}
          isUseDelay={isUseDelay}
          isRandomDelay={isRandomDelay}
          delaySec={delaySec}
          delayStart={delayStart}
          delayEnd={delayEnd}
          isWaitResponse={isWaitResponse}
          errorTrace={errorTrace}
          errorWebhook={errorWebhook}
          headers={headers}
          keyStatus={keyStatus}
          disableKey={isEdit}
          onNameChange={setName}
          onKeyChange={(value) => {
            setKey(value);
            setKeyStatus("idle");
          }}
          onOriginChange={setOrigin}
          onColorChange={setColor}
          onBatchCountChange={setBatchCount}
          onTimeoutChange={setTimeout}
          onIsSendNowChange={setIsSendNow}
          onSendLaterTimeChange={setSendLaterTime}
          onIsUseDelayChange={setIsUseDelay}
          onIsRandomDelayChange={setIsRandomDelay}
          onDelaySecChange={setDelaySec}
          onDelayStartChange={setDelayStart}
          onDelayEndChange={setDelayEnd}
          onIsWaitResponseChange={setIsWaitResponse}
          onErrorTraceChange={setErrorTrace}
          onErrorWebhookChange={setErrorWebhook}
          onAddHeader={addHeader}
          onUpdateHeader={updateHeader}
          onRemoveHeader={removeHeader}
          onKeyBlur={handleKeyBlur}
        />

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
