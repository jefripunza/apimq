import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "@/stores/authStore";
import { Eye, EyeOff, Terminal, Zap, Lock } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      if (username === "admin" && password === "admin") {
        login("mock-jwt-token", { username: "admin", role: "admin" });
        navigate("/app/dashboard", { replace: true });
      } else {
        setError("Invalid credentials. Try admin / admin");
      }
    } catch {
      setError("Connection failed. Check your server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center px-4 animate-fade-in">
      {/* Logo & Brand */}
      <div className="flex items-center gap-3 mb-8">
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-accent-500/20 border border-accent-500/30 flex items-center justify-center">
            <Zap className="w-6 h-6 text-accent-400" />
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-neon-green rounded-full animate-pulse-glow" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            ApiMQ
          </h1>
          <p className="text-xs text-dark-300 font-mono">
            Message Queue Dashboard
          </p>
        </div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md">
        <div className="bg-dark-800/80 backdrop-blur-xl border border-dark-600/50 rounded-2xl p-8 shadow-2xl shadow-black/20">
          {/* Header */}
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-4 h-4 text-dark-300" />
            <span className="text-sm text-dark-300 font-mono">
              authentication required
            </span>
          </div>

          {/* Terminal-style hint */}
          <div className="bg-dark-900/80 rounded-lg p-3 mb-6 border border-dark-600/30">
            <div className="flex items-center gap-2 text-xs font-mono">
              <Terminal className="w-3.5 h-3.5 text-neon-green" />
              <span className="text-neon-green">$</span>
              <span className="text-dark-200">
                apimq connect --dashboard
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-neon-red/10 border border-neon-red/20 rounded-lg px-4 py-3 mb-4">
              <p className="text-sm text-neon-red font-mono">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full px-4 py-3 bg-dark-900/60 border border-dark-500/50 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
                required
                autoFocus
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 pr-12 bg-dark-900/60 border border-dark-500/50 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-accent-500 hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-accent-500/25 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Terminal className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-5 border-t border-dark-600/30">
            <p className="text-center text-xs text-dark-400 font-mono">
              ApiMQ v0.1.0 — Secure Dashboard Access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
