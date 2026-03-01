import { useState } from "react";
import { useNavigate } from "react-router";
import { Switch } from "./ui/switch";
import {
  Settings,
  Activity,
  ArrowUpRight,
  FileText,
  Code,
  Loader2,
  Send,
} from "lucide-react";
import { useQueueStore } from "@/stores/queueStore";
import { queueService } from "@/services/queue.service";
import type { Queue } from "@/types/queue";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import JsonEditor from "@/components/JsonEditor";

export default function QueueCard({
  queue,
  onOpenErrors,
}: {
  queue: Queue;
  onOpenErrors: (queue: Queue) => void;
}) {
  const navigate = useNavigate();
  const toggleQueueEnabled = useQueueStore((s) => s.toggleEnabled);
  const isError = queue.status === "error";

  const [isCodeOpen, setIsCodeOpen] = useState(false);
  const [jsonBody, setJsonBody] = useState("{}");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);

  const handleSendTest = async () => {
    setSendError("");
    setSendSuccess(false);
    setIsSending(true);
    try {
      await queueService.sendTestMessage(queue.key, jsonBody);
      setSendSuccess(true);
      setTimeout(() => {
        setIsCodeOpen(false);
        setSendSuccess(false);
        setJsonBody("{}");
      }, 1500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to send message";
      setSendError(msg);
    } finally {
      setIsSending(false);
    }
  };

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
            <Dialog open={isCodeOpen} onOpenChange={setIsCodeOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-dark-400 hover:text-accent-400 hover:bg-dark-700/50 transition-all"
                  title="Test message"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Send Test Message</DialogTitle>
                  <DialogDescription>
                    Send a test JSON message to queue{" "}
                    <span className="font-mono text-accent-400">
                      {queue.key}
                    </span>
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <JsonEditor
                    value={jsonBody}
                    onChange={setJsonBody}
                    height={250}
                  />
                  {sendError && (
                    <p className="mt-2 text-xs text-neon-red font-mono">
                      {sendError}
                    </p>
                  )}
                  {sendSuccess && (
                    <p className="mt-2 text-xs text-neon-green font-mono">
                      Message sent successfully!
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <button
                    type="button"
                    onClick={() => setIsCodeOpen(false)}
                    className="px-4 py-2 text-sm font-semibold text-dark-300 hover:text-foreground border border-dark-600/50 hover:border-dark-500/60 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendTest}
                    disabled={isSending}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-accent-500 hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send
                      </>
                    )}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
            {queue.messages}
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
        <button
          type="button"
          onClick={() => onOpenErrors(queue)}
          className="flex items-center gap-1 text-xs font-mono text-neon-red cursor-pointer"
        >
          <FileText className="w-3 h-3" />
          <span>{queue.deliverRate}</span>
          <span className="text-dark-500 ml-1 underline">error</span>
        </button>
      </div>
    </div>
  );
}
