import { useNavigate } from "react-router";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl">
        <div className="bg-dark-800/60 border border-dark-600/40 rounded-2xl overflow-hidden">
          <div className="px-6 py-6 border-b border-dark-600/40 flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center shrink-0">
              <SearchX className="w-5 h-5 text-accent-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                404 - Page not found
              </h1>
              <p className="text-sm text-dark-300 mt-1 font-mono wrap-break-word">
                The page you requested doesn&apos;t exist or has been moved.
              </p>
            </div>
          </div>

          <div className="px-6 py-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="text-xs text-dark-400 font-mono">
              Try checking the URL, or go back to a safe page.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-dark-300 hover:text-foreground border border-dark-600/50 hover:border-dark-500/60 rounded-xl transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
