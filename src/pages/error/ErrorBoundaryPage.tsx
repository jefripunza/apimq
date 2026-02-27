import { useMemo, useState } from "react";
import { isRouteErrorResponse, useRouteError, Link } from "react-router";
import {
  AlertTriangle,
  Bug,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Home,
} from "lucide-react";

function getErrorParts(err: unknown) {
  if (isRouteErrorResponse(err)) {
    const data =
      typeof err.data === "string"
        ? err.data
        : err.data
          ? JSON.stringify(err.data, null, 2)
          : "";

    return {
      title: `${err.status} ${err.statusText}`,
      message: data || "A routing error occurred.",
      stack: "",
    };
  }

  if (err instanceof Error) {
    return {
      title: err.name || "Error",
      message: err.message || "Something went wrong.",
      stack: err.stack || "",
    };
  }

  return {
    title: "Unknown Error",
    message: typeof err === "string" ? err : "An unexpected error occurred.",
    stack: "",
  };
}

export default function ErrorBoundaryPage() {
  const routeError = useRouteError();
  const { title, message, stack } = useMemo(
    () => getErrorParts(routeError),
    [routeError],
  );

  const [showStack, setShowStack] = useState(true);
  const [copied, setCopied] = useState(false);

  const stackText = stack || "(no stack trace available)";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(stackText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl">
        <div className="bg-dark-800/60 border border-dark-600/40 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-dark-600/40 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-accent-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">{title}</h1>
                <p className="text-sm text-dark-300 mt-1 font-mono wrap-break-word">
                  {message}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/app/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-dark-300 hover:text-foreground border border-dark-600/50 hover:border-dark-500/60 rounded-xl transition-all"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </Link>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-dark-300 hover:text-foreground border border-dark-600/50 hover:border-dark-500/60 rounded-xl transition-all"
              >
                <Bug className="w-4 h-4" />
                Login
              </Link>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-dark-900/40 border border-dark-600/30 rounded-xl text-sm font-mono text-dark-200">
              <button
                type="button"
                onClick={() => setShowStack((v) => !v)}
                className="flex items-center gap-2 hover:text-foreground transition-colors"
              >
                <Bug className="w-4 h-4 text-accent-400" />
                Stack trace
                {showStack ? (
                  <ChevronUp className="w-4 h-4 ml-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-1" />
                )}
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dark-600/40 hover:border-dark-500/60 hover:text-foreground transition-all"
                title="Copy stack trace"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-neon-green" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span className="text-xs">{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            {showStack && (
              <pre className="bg-dark-900/60 border border-dark-600/30 rounded-xl p-4 overflow-auto max-h-90 text-xs text-dark-200 font-mono whitespace-pre-wrap">
                {stackText}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
