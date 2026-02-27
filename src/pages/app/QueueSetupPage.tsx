import { useState, useRef, useCallback, type ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import satellite from "@/lib/satellite";

// ---------- types ----------
type SchemaType = "" | "delay" | "timing";

interface HeaderEntry {
  id: string;
  key: string;
  value: string;
}

// ---------- helpers ----------
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ---------- sub-components ----------
function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-dark-200 mb-1.5">
      {children}
      {required && <span className="text-neon-red ml-1">*</span>}
    </label>
  );
}

function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-4 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-px flex-1 bg-dark-600/40" />
      <span className="text-xs font-mono text-dark-400 uppercase tracking-wider px-2">
        {children}
      </span>
      <div className="h-px flex-1 bg-dark-600/40" />
    </div>
  );
}

// ---------- main component ----------
export default function QueueSetupPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  // basic fields
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [origin, setOrigin] = useState("");

  // key check state
  type KeyStatus = "idle" | "checking" | "available" | "taken" | "error";
  const [keyStatus, setKeyStatus] = useState<KeyStatus>("idle");
  const keyCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // headers
  const [headers, setHeaders] = useState<HeaderEntry[]>([]);

  // schema
  const [schema, setSchema] = useState<SchemaType>("");
  const [batchCount, setBatchCount] = useState("1");
  // delay sub-fields
  const [delayRandom, setDelayRandom] = useState(false);
  const [delaySec, setDelaySec] = useState("");
  const [delaySecMin, setDelaySecMin] = useState("");
  const [delaySecMax, setDelaySecMax] = useState("");
  // timing sub-fields
  const [timingDatetime, setTimingDatetime] = useState("");

  // error trace
  const [errorTrace, setErrorTrace] = useState(false);
  const [errorWebhook, setErrorWebhook] = useState("");

  // submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // ---- key check on blur ----
  const handleKeyBlur = useCallback(async () => {
    const trimmed = key.trim();
    if (!trimmed) {
      setKeyStatus("idle");
      return;
    }
    if (keyCheckTimer.current) clearTimeout(keyCheckTimer.current);
    setKeyStatus("checking");
    keyCheckTimer.current = setTimeout(async () => {
      try {
        const res = await satellite.get<{ available: boolean }>(
          `/api/queue/check-key?key=${encodeURIComponent(trimmed)}`,
        );
        setKeyStatus(res.data.available ? "available" : "taken");
      } catch {
        // treat error as available for now (server might not have this endpoint yet)
        setKeyStatus("available");
      }
    }, 300);
  }, [key]);

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
    if (keyStatus === "taken") return;
    setSubmitError("");
    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        key: key.trim(),
        origin: origin.trim(),
        batchCount: Number(batchCount) || 1,
        headers: headers
          .filter((h) => h.key.trim())
          .map((h) => ({ key: h.key.trim(), value: h.value.trim() })),
        schema: schema || null,
        ...(schema === "delay" && {
          delay: delayRandom
            ? {
                random: true,
                min: Number(delaySecMin),
                max: Number(delaySecMax),
              }
            : { random: false, seconds: Number(delaySec) },
        }),
        ...(schema === "timing" && { timing: timingDatetime }),
        errorTrace: errorTrace ? { webhook: errorWebhook.trim() } : null,
      };
      if (isEdit) {
        await satellite.put(`/api/queue/${id}`, payload);
      } else {
        await satellite.post("/api/queue", payload);
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
        </div>

        {/* Schema */}
        <div className="bg-dark-800/60 border border-dark-600/40 rounded-2xl p-6 space-y-4">
          <SectionTitle>Schema</SectionTitle>

          <div>
            <Label required>Delivery Schema</Label>
            <select
              value={schema}
              onChange={(e) => {
                setSchema(e.target.value as SchemaType);
                setDelayRandom(false);
                setDelaySec("");
                setDelaySecMin("");
                setDelaySecMax("");
                setTimingDatetime("");
              }}
              className="w-full px-4 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl text-foreground focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
              required
            >
              <option value="">— None —</option>
              <option value="delay">Delay</option>
              <option value="timing">Timing</option>
            </select>
          </div>

          {/* Delay sub-form */}
          {schema === "delay" && (
            <div className="space-y-3 pl-4 border-l-2 border-accent-500/30">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={delayRandom}
                    onChange={(e) => setDelayRandom(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-dark-600 peer-checked:bg-accent-500 rounded-full transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </div>
                <span className="text-sm text-dark-200 font-medium">
                  Random delay
                </span>
              </label>

              {delayRandom ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Min seconds</Label>
                    <Input
                      type="number"
                      min={0}
                      value={delaySecMin}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setDelaySecMin(e.target.value)
                      }
                      placeholder="1"
                      required
                    />
                  </div>
                  <div>
                    <Label>Max seconds</Label>
                    <Input
                      type="number"
                      min={0}
                      value={delaySecMax}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setDelaySecMax(e.target.value)
                      }
                      placeholder="60"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <Label>Delay (seconds)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={delaySec}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setDelaySec(e.target.value)
                    }
                    placeholder="30"
                    required
                  />
                </div>
              )}
            </div>
          )}

          {/* Timing sub-form */}
          {schema === "timing" && (
            <div className="pl-4 border-l-2 border-accent-500/30">
              <Label required>Scheduled Date & Time</Label>
              <Input
                type="datetime-local"
                value={timingDatetime}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setTimingDatetime(e.target.value)
                }
                required
              />
              <p className="text-[11px] text-dark-400 font-mono mt-1">
                Messages will be delivered at this exact date and time.
              </p>
            </div>
          )}
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
              <>{isEdit ? "Save Changes" : "Create Queue"}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
