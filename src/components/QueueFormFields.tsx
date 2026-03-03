import type { ChangeEvent, InputHTMLAttributes } from "react";
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
import type { HeaderEntry, KeyStatus } from "@/types/queue";

type Variant = "page" | "dialog";

type Props = {
  variant: Variant;
  name: string;
  keyValue: string;
  origin: string;
  color: string;
  batchCount: string;
  timeout: string;
  isSendNow: boolean;
  sendLaterTime: string;
  isUseDelay: boolean;
  isRandomDelay: boolean;
  delaySec: string;
  delayStart: string;
  delayEnd: string;
  isWaitResponse: boolean;
  errorTrace: boolean;
  errorWebhook: string;
  headers: HeaderEntry[];
  keyStatus: KeyStatus;
  disableKey?: boolean;
  autoFocusName?: boolean;
  onNameChange: (value: string) => void;
  onKeyChange: (value: string) => void;
  onOriginChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onBatchCountChange: (value: string) => void;
  onTimeoutChange: (value: string) => void;
  onIsSendNowChange: (value: boolean) => void;
  onSendLaterTimeChange: (value: string) => void;
  onIsUseDelayChange: (value: boolean) => void;
  onIsRandomDelayChange: (value: boolean) => void;
  onDelaySecChange: (value: string) => void;
  onDelayStartChange: (value: string) => void;
  onDelayEndChange: (value: string) => void;
  onIsWaitResponseChange: (value: boolean) => void;
  onErrorTraceChange: (value: boolean) => void;
  onErrorWebhookChange: (value: string) => void;
  onAddHeader: () => void;
  onUpdateHeader: (id: string, field: "key" | "value", value: string) => void;
  onRemoveHeader: (id: string) => void;
  onKeyBlur?: () => void;
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

function TextInput({
  variant,
  ...props
}: {
  variant: Variant;
} & InputHTMLAttributes<HTMLInputElement>) {
  if (variant === "page") {
    return <Input {...props} />;
  }

  return (
    <input
      {...props}
      className={`w-full px-4 py-2.5 bg-dark-900/60 border border-dark-500/50 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm ${props.className ?? ""}`}
    />
  );
}

function FieldLabel({
  variant,
  required,
  children,
}: {
  variant: Variant;
  required?: boolean;
  children: string;
}) {
  if (variant === "page") {
    return <Label required={required}>{children}</Label>;
  }

  return (
    <label className="block text-sm font-medium text-dark-200 mb-1.5">
      {children}
      {required && <span className="text-neon-red ml-1">*</span>}
    </label>
  );
}

export default function QueueFormFields(props: Props) {
  const {
    variant,
    name,
    keyValue,
    origin,
    color,
    batchCount,
    timeout,
    isSendNow,
    sendLaterTime,
    isUseDelay,
    isRandomDelay,
    delaySec,
    delayStart,
    delayEnd,
    isWaitResponse,
    errorTrace,
    errorWebhook,
    headers,
    keyStatus,
    disableKey,
    autoFocusName,
    onNameChange,
    onKeyChange,
    onOriginChange,
    onColorChange,
    onBatchCountChange,
    onTimeoutChange,
    onIsSendNowChange,
    onSendLaterTimeChange,
    onIsUseDelayChange,
    onIsRandomDelayChange,
    onDelaySecChange,
    onDelayStartChange,
    onDelayEndChange,
    onIsWaitResponseChange,
    onErrorTraceChange,
    onErrorWebhookChange,
    onAddHeader,
    onUpdateHeader,
    onRemoveHeader,
    onKeyBlur,
  } = props;

  const basicBlockClass =
    variant === "page"
      ? "bg-dark-800/60 border border-dark-600/40 rounded-2xl p-6 space-y-5"
      : "space-y-4";

  return (
    <>
      <div className={basicBlockClass}>
        {variant === "page" && <SectionTitle>Basic Info</SectionTitle>}

        <div>
          <FieldLabel variant={variant} required>
            Name
          </FieldLabel>
          <TextInput
            variant={variant}
            value={name}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onNameChange(e.target.value)
            }
            placeholder="e.g. order.processing"
            autoFocus={autoFocusName}
            required
          />
        </div>

        <div>
          <FieldLabel variant={variant} required>
            Key
          </FieldLabel>
          <TextInput
            variant={variant}
            value={keyValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onKeyChange(e.target.value)
            }
            onBlur={onKeyBlur}
            placeholder="unique-queue-key"
            disabled={disableKey}
            required
          />
          <KeyStatusHint keyStatus={keyStatus} />
        </div>

        <div>
          <FieldLabel variant={variant} required>
            Origin
          </FieldLabel>
          <TextInput
            variant={variant}
            value={origin}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onOriginChange(e.target.value)
            }
            placeholder="https://your-service.com"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel variant={variant}>Color</FieldLabel>
            <TextInput
              variant={variant}
              type="color"
              value={color}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onColorChange(e.target.value)
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
                onCheckedChange={onIsWaitResponseChange}
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className={
          variant === "page"
            ? "bg-dark-800/60 border border-dark-600/40 rounded-2xl p-6 space-y-4"
            : "space-y-2"
        }
      >
        {variant === "page" && <SectionTitle>Headers</SectionTitle>}
        <div className="flex items-center justify-between">
          {variant === "dialog" && (
            <div>
              <p className="text-sm text-dark-200 font-medium">Headers</p>
              <p className="text-xs text-dark-400 font-mono">
                Optional HTTP headers
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={onAddHeader}
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
                <TextInput
                  variant={variant}
                  value={h.key}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onUpdateHeader(h.id, "key", e.target.value)
                  }
                  placeholder="Header-Key"
                  className="flex-1"
                />
                <TextInput
                  variant={variant}
                  value={h.value}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onUpdateHeader(h.id, "value", e.target.value)
                  }
                  placeholder="value"
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => onRemoveHeader(h.id)}
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
          variant === "page"
            ? "bg-dark-800/60 border border-dark-600/40 rounded-2xl p-6 space-y-4"
            : "space-y-4"
        }
      >
        {variant === "page" && <SectionTitle>Batch</SectionTitle>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel variant={variant} required>
              Batch Count
            </FieldLabel>
            <TextInput
              variant={variant}
              type="number"
              min={1}
              value={batchCount}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onBatchCountChange(e.target.value)
              }
              required
            />
          </div>
          <div>
            <FieldLabel variant={variant} required>
              Timeout (sec)
            </FieldLabel>
            <TextInput
              variant={variant}
              type="number"
              min={1}
              value={timeout}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onTimeoutChange(e.target.value)
              }
              required
            />
          </div>
        </div>
      </div>

      <div
        className={
          variant === "page"
            ? "bg-dark-800/60 border border-dark-600/40 rounded-2xl p-6 space-y-4"
            : "space-y-3"
        }
      >
        {variant === "page" && <SectionTitle>Timing & Delay</SectionTitle>}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-dark-200 font-medium">Send Now</p>
            <p className="text-xs text-dark-400 font-mono">
              Send messages immediately when added
            </p>
          </div>
          <Switch checked={isSendNow} onCheckedChange={onIsSendNowChange} />
        </div>

        {!isSendNow && (
          <div className="pl-4 border-l-2 border-accent-500/30">
            <FieldLabel variant={variant} required>
              Scheduled Time
            </FieldLabel>
            <TextInput
              variant={variant}
              type="time"
              value={sendLaterTime}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onSendLaterTimeChange(e.target.value)
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
            <Switch checked={isUseDelay} onCheckedChange={onIsUseDelayChange} />
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
                onCheckedChange={onIsRandomDelayChange}
              />
            </div>

            {isRandomDelay ? (
              <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-accent-500/30">
                <div>
                  <FieldLabel variant={variant}>Min seconds</FieldLabel>
                  <TextInput
                    variant={variant}
                    type="number"
                    min={0}
                    value={delayStart}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      onDelayStartChange(e.target.value)
                    }
                  />
                </div>
                <div>
                  <FieldLabel variant={variant}>Max seconds</FieldLabel>
                  <TextInput
                    variant={variant}
                    type="number"
                    min={0}
                    value={delayEnd}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      onDelayEndChange(e.target.value)
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="pl-4 border-l-2 border-accent-500/30">
                <FieldLabel variant={variant}>Delay (seconds)</FieldLabel>
                <TextInput
                  variant={variant}
                  type="number"
                  min={0}
                  value={delaySec}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onDelaySecChange(e.target.value)
                  }
                />
              </div>
            )}
          </>
        )}
      </div>

      <div
        className={
          variant === "page"
            ? "bg-dark-800/60 border border-dark-600/40 rounded-2xl p-6 space-y-4"
            : "space-y-2"
        }
      >
        {variant === "page" && <SectionTitle>Error Handling</SectionTitle>}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-dark-200 font-medium">Error trace</p>
            <p className="text-xs text-dark-400 font-mono">
              Notify webhook on delivery error
            </p>
          </div>
          <Switch checked={errorTrace} onCheckedChange={onErrorTraceChange} />
        </div>

        {errorTrace && (
          <div className="pl-4 border-l-2 border-neon-red/30">
            <FieldLabel variant={variant} required>
              Error webhook URL
            </FieldLabel>
            <TextInput
              variant={variant}
              type="url"
              value={errorWebhook}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onErrorWebhookChange(e.target.value)
              }
              placeholder="https://your-service.com/error"
              required
            />
          </div>
        )}
      </div>
    </>
  );
}
