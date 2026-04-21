import {
  useEffect,
  useState,
  useRef,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import SectionTitle from "@/components/SectionTitle";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uid } from "@/utils/random";
import type {
  AuthMethod,
  HeaderEntry,
  KeyStatus,
  Queue,
  QueueAuth,
} from "@/types/queue";
import { useQueueStore } from "@/stores/queueStore";
import type {
  CreateQueuePayload,
  UpdateQueuePayload,
} from "@/services/queue.service";

type Props = {
  queue?: Queue | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  autoFocusName?: boolean;
};

function KeyStatusHint({ keyStatus }: { keyStatus: KeyStatus }) {
  if (keyStatus === "idle") return null;
  if (keyStatus === "checking") {
    return (
      <p className="text-xs text-dark-400 font-mono mt-1.5 flex items-center gap-1.5">
        <Loader2 className="w-3 h-3 animate-spin" />
        checking availability...
      </p>
    );
  }
  if (keyStatus === "available") {
    return (
      <p className="text-xs text-neon-green font-mono mt-1.5 flex items-center gap-1.5">
        <CheckCircle2 className="w-3 h-3" />
        key is available
      </p>
    );
  }
  if (keyStatus === "taken") {
    return (
      <p className="text-xs text-neon-red font-mono mt-1.5 flex items-center gap-1.5">
        <XCircle className="w-3 h-3" />
        key already taken
      </p>
    );
  }
  return (
    <p className="text-xs text-neon-yellow font-mono mt-1.5 flex items-center gap-1.5">
      <AlertCircle className="w-3 h-3" />
      could not verify key
    </p>
  );
}

export default function QueueForm({
  queue,
  onSuccess,
  onCancel,
  autoFocusName,
}: Props) {
  const isEdit = !!queue;

  const {
    create: createQueue,
    update: updateQueue,
    checkKeyAvailable,
  } = useQueueStore();

  // Form state
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [origin, setOrigin] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [batchCount, setBatchCount] = useState("1");
  const [timeout, setTimeout] = useState("30");
  const [isSendNow, setIsSendNow] = useState(true);
  const [sendLaterTime, setSendLaterTime] = useState("");
  const [isUseDelay, setIsUseDelay] = useState(true);
  const [isRandomDelay, setIsRandomDelay] = useState(false);
  const [delaySec, setDelaySec] = useState("");
  const [delayStart, setDelayStart] = useState("");
  const [delayEnd, setDelayEnd] = useState("");
  const [isWaitResponse, setIsWaitResponse] = useState(true);
  const [errorTrace, setErrorTrace] = useState(false);
  const [errorWebhook, setErrorWebhook] = useState("");
  const [headers, setHeaders] = useState<HeaderEntry[]>([]);

  // Auth state
  const [authMethod, setAuthMethod] = useState<
    "none" | "basic" | "bearer" | "api_key"
  >("none");
  const [authBasicUser, setAuthBasicUser] = useState("");
  const [authBasicPass, setAuthBasicPass] = useState("");
  const [authBearerToken, setAuthBearerToken] = useState("");
  const [authApiKey, setAuthApiKey] = useState("");
  const [authApiHeader, setAuthApiHeader] = useState("X-Api-Key");

  // Key check
  const [keyStatus, setKeyStatus] = useState<KeyStatus>("idle");
  const keyCheckTimer = useRef<number | null>(null);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Initialize form from queue (edit mode)
  useEffect(() => {
    if (!queue) {
      // Reset to defaults for add mode
      setName("");
      setKey("");
      setOrigin("");
      setColor("#6366f1");
      setBatchCount("1");
      setTimeout("30");
      setIsSendNow(true);
      setSendLaterTime("");
      setIsUseDelay(true);
      setIsRandomDelay(false);
      setDelaySec("");
      setDelayStart("");
      setDelayEnd("");
      setIsWaitResponse(true);
      setErrorTrace(false);
      setErrorWebhook("");
      setHeaders([]);
      setAuthMethod("none");
      setAuthBasicUser("");
      setAuthBasicPass("");
      setAuthBearerToken("");
      setAuthApiKey("");
      setAuthApiHeader("X-Api-Key");
      setKeyStatus("idle");
      return;
    }

    // Populate from queue
    setName(queue.name ?? "");
    setKey(queue.key ?? "");
    setOrigin(queue.origin ?? "");
    setColor(queue.color ?? "#6366f1");
    setBatchCount(String(queue.batchCount ?? 1));
    setTimeout(String(queue.timeout ?? 30));
    setIsSendNow(queue.isSendNow ?? true);
    if (queue.sendLaterTime) {
      const d = new Date(queue.sendLaterTime);
      if (!Number.isNaN(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        setSendLaterTime(`${hh}:${mm}`);
      }
    } else {
      setSendLaterTime("");
    }
    setIsUseDelay(queue.isUseDelay ?? true);
    setIsRandomDelay(queue.isRandomDelay ?? false);
    setDelaySec(String(queue.delaySec ?? ""));
    setDelayStart(String(queue.delayStart ?? ""));
    setDelayEnd(String(queue.delayEnd ?? ""));
    setIsWaitResponse(queue.isWaitResponse ?? true);
    const et = queue.errorTrace ?? {};
    const webhook = String((et as { webhook?: unknown }).webhook ?? "");
    setErrorTrace(Boolean(webhook));
    setErrorWebhook(webhook);
    setHeaders(
      (queue.headers ?? []).map((h) => ({
        id: uid(),
        key: h.key ?? "",
        value: h.value ?? "",
      })),
    );

    const auth = queue.auth as QueueAuth;
    setAuthMethod(auth?.method || "none");
    setAuthBasicUser(auth?.basic?.username || "");
    setAuthBasicPass(auth?.basic?.password || "");
    setAuthBearerToken(auth?.bearer?.token || "");
    setAuthApiKey(auth?.api_key?.key || "");
    setAuthApiHeader(auth?.api_key?.header || "X-Api-Key");

    setKeyStatus("idle");
  }, [queue]);

  // Key blur handler
  const handleKeyBlur = async () => {
    if (isEdit) {
      setKeyStatus("idle");
      return;
    }
    const trimmed = key.trim();
    if (!trimmed) {
      setKeyStatus("idle");
      return;
    }
    if (keyCheckTimer.current) clearTimeout(keyCheckTimer.current);
    setKeyStatus("checking");
    keyCheckTimer.current = globalThis.setTimeout(async () => {
      try {
        const available = await checkKeyAvailable(trimmed);
        setKeyStatus(available ? "available" : "taken");
      } catch {
        setKeyStatus("available");
      }
    }, 300);
  };

  // Header helpers
  const addHeader = () =>
    setHeaders((prev) => [...prev, { id: uid(), key: "", value: "" }]);
  const updateHeader = (id: string, field: "key" | "value", val: string) =>
    setHeaders((prev) =>
      prev.map((h) => (h.id === id ? { ...h, [field]: val } : h)),
    );
  const removeHeader = (id: string) =>
    setHeaders((prev) => prev.filter((h) => h.id !== id));

  // Compute send later ISO
  const computeNextSendLaterISO = (timeStr: string) => {
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

  // Submit handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (keyStatus === "taken") return;

    setSubmitError("");
    setIsSubmitting(true);

    try {
      const errorTracePayload: Record<string, unknown> = {};
      if (errorTrace) {
        errorTracePayload.webhook = errorWebhook.trim();
      }

      const authPayload: Record<string, unknown> = { method: authMethod };
      if (authMethod === "basic") {
        authPayload.basic = {
          username: authBasicUser,
          password: authBasicPass,
        };
      } else if (authMethod === "bearer") {
        authPayload.bearer = { token: authBearerToken };
      } else if (authMethod === "api_key") {
        authPayload.api_key = { key: authApiKey, header: authApiHeader };
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
        isUseDelay: isSendNow ? isUseDelay : false,
        isRandomDelay,
        delaySec: !isRandomDelay ? Number(delaySec || 0) : 0,
        delayStart: isRandomDelay ? Number(delayStart || 0) : 0,
        delayEnd: isRandomDelay ? Number(delayEnd || 0) : 0,
        isWaitResponse,
        auth: authPayload,
        errorTrace: errorTracePayload,
      };

      let ok: boolean;
      if (isEdit && queue) {
        ok = await updateQueue(queue.id, basePayload as UpdateQueuePayload);
      } else {
        ok = await createQueue({
          ...basePayload,
          key: key.trim(),
        } as CreateQueuePayload);
      }

      if (!ok) {
        setSubmitError(
          isEdit ? "Failed to save queue." : "Failed to create queue.",
        );
        return;
      }

      onSuccess?.();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ??
        (isEdit ? "Failed to save queue." : "Failed to create queue.");
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div
        className={
          "bg-dark-800/60 border border-dark-600/40 rounded-2xl p-6 space-y-5"
        }
      >
        <SectionTitle>Basic Info</SectionTitle>

        <div>
          <Label required>Name</Label>
          <Input
            value={name}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setName(e.target.value)
            }
            placeholder="e.g. order.processing"
            autoFocus={autoFocusName}
            required
          />
        </div>

        <div>
          <Label required>Key</Label>
          <Input
            value={key}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setKey(e.target.value);
              setKeyStatus("idle");
            }}
            onBlur={handleKeyBlur}
            placeholder="unique-queue-key"
            disabled={isEdit}
            required
          />
          <KeyStatusHint keyStatus={keyStatus} />
        </div>

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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label required>Color</Label>
            <Input
              type="color"
              value={color}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setColor(e.target.value)
              }
              className="h-11"
            />
          </div>

          <div className="flex items-end">
            <div className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl">
              <div>
                <p className="text-sm text-dark-200 font-medium">
                  Wait Response
                </p>
                <p className="text-xs text-dark-400 font-mono">
                  Wait target HTTP response before completing
                </p>
              </div>
              <Switch
                checked={isWaitResponse}
                onCheckedChange={setIsWaitResponse}
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className={
          "bg-dark-800/60 border border-dark-600/40 rounded-2xl p-6 space-y-4"
        }
      >
        <SectionTitle>Authorizations</SectionTitle>
        <div className="space-y-4">
          <div>
            <Label>Auth Method</Label>
            <select
              value={authMethod}
              onChange={(e) => setAuthMethod(e.target.value as AuthMethod)}
              className="flex h-11 w-full rounded-xl border border-dark-600/50 bg-dark-900/50 px-3 py-2 text-sm text-foreground shadow-sm shadow-black/5 ring-offset-background transition-all hover:border-dark-500/50"
            >
              <option value="none">None</option>
              <option value="basic">Basic Auth</option>
              <option value="bearer">Bearer Token</option>
              <option value="api_key">API Key</option>
            </select>
          </div>

          {authMethod === "basic" && (
            <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-accent-500/30">
              <div>
                <Label>Username</Label>
                <Input
                  value={authBasicUser}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setAuthBasicUser(e.target.value)
                  }
                  placeholder="admin"
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={authBasicPass}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setAuthBasicPass(e.target.value)
                  }
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          {authMethod === "bearer" && (
            <div className="pl-4 border-l-2 border-accent-500/30">
              <Label>Token</Label>
              <Input
                type="password"
                value={authBearerToken}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setAuthBearerToken(e.target.value)
                }
                placeholder="eyJh..."
              />
            </div>
          )}

          {authMethod === "api_key" && (
            <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-accent-500/30">
              <div>
                <Label>Header Key</Label>
                <Input
                  value={authApiHeader}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setAuthApiHeader(e.target.value)
                  }
                  placeholder="X-Api-Key"
                />
              </div>
              <div>
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={authApiKey}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setAuthApiKey(e.target.value)
                  }
                  placeholder="your-api-key"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className={
          "bg-dark-800/60 border border-dark-600/40 rounded-2xl p-6 space-y-4"
        }
      >
        <SectionTitle>Headers</SectionTitle>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-dark-200 font-medium">Headers</p>
            <p className="text-xs text-dark-400 font-mono">
              Optional HTTP headers
            </p>
          </div>
          <button
            type="button"
            onClick={addHeader}
            className="flex items-center gap-2 px-3 py-2 text-xs font-mono text-dark-300 hover:text-foreground border border-dashed border-dark-500/60 hover:border-dark-400/60 rounded-xl transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>

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
      </div>

      <div
        className={
          "bg-dark-800/60 border border-dark-600/40 rounded-2xl p-6 space-y-4"
        }
      >
        <SectionTitle>Batch</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label required>Batch Count</Label>
            <Input
              type="number"
              min={1}
              value={batchCount}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setBatchCount(e.target.value)
              }
              required
            />
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
              required
            />
          </div>
        </div>
      </div>

      <div
        className={
          "bg-dark-800/60 border border-dark-600/40 rounded-2xl p-6 space-y-4"
        }
      >
        <SectionTitle>Timing & Delay</SectionTitle>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-dark-200 font-medium">Send Now</p>
            <p className="text-xs text-dark-400 font-mono">
              Send messages immediately when added
            </p>
          </div>
          <Switch checked={isSendNow} onCheckedChange={setIsSendNow} />
        </div>

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
          </div>
        )}

        {isSendNow && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-200 font-medium">Use Delay</p>
              <p className="text-xs text-dark-400 font-mono">
                Enable delay settings for send-now queues
              </p>
            </div>
            <Switch checked={isUseDelay} onCheckedChange={setIsUseDelay} />
          </div>
        )}

        {isSendNow && isUseDelay && (
          <>
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
                checked={isRandomDelay}
                onCheckedChange={setIsRandomDelay}
              />
            </div>

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
                />
              </div>
            )}
          </>
        )}
      </div>

      <div
        className={
          "bg-dark-800/60 border border-dark-600/40 rounded-2xl p-6 space-y-4"
        }
      >
        <SectionTitle>Error Handling</SectionTitle>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-dark-200 font-medium">Error trace</p>
            <p className="text-xs text-dark-400 font-mono">
              Notify webhook on delivery error
            </p>
          </div>
          <Switch checked={errorTrace} onCheckedChange={setErrorTrace} />
        </div>

        {errorTrace && (
          <div className="pl-4 border-l-2 border-neon-red/30">
            <Label required>Error webhook URL</Label>
            <Input
              type="url"
              value={errorWebhook}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setErrorWebhook(e.target.value)
              }
              placeholder="https://your-service.com/error"
              required
            />
          </div>
        )}
      </div>

      {submitError && (
        <div className="flex items-start gap-2 bg-neon-red/10 border border-neon-red/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-neon-red shrink-0 mt-0.5" />
          <p className="text-sm text-neon-red font-mono">{submitError}</p>
        </div>
      )}

      <div className="flex items-center gap-3 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-semibold text-dark-300 hover:text-foreground border border-dark-600/50 hover:border-dark-500/60 rounded-xl transition-all"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={
            isSubmitting || keyStatus === "taken" || keyStatus === "checking"
          }
          className="flex items-center gap-2 px-6 py-2.5 bg-accent-500 hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-accent-500/25"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isEdit ? "Saving..." : "Creating..."}
            </>
          ) : isEdit ? (
            "Save Changes"
          ) : (
            "Create Queue"
          )}
        </button>
      </div>
    </form>
  );
}
