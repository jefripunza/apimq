import { useState } from "react";
import { Key, Eye, EyeOff } from "lucide-react";

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

export default function SettingPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [saveMsg, setSaveMsg] = useState("");

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setSaveMsg("Passwords do not match.");
      setTimeout(() => setSaveMsg(""), 3000);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSaveMsg("Password changed successfully.");
    setTimeout(() => setSaveMsg(""), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Setting</h2>
        <p className="text-sm text-dark-300 mt-1">
          Manage your account, appearance, and API configuration
        </p>
      </div>

      {/* Toast */}
      {saveMsg && (
        <div className="px-4 py-3 bg-neon-green/10 border border-neon-green/20 rounded-xl text-sm text-neon-green font-mono">
          {saveMsg}
        </div>
      )}

      {/* Change password */}
      <form
        onSubmit={handleChangePassword}
        className="bg-dark-800/60 border border-dark-600/40 rounded-2xl p-6 space-y-4"
      >
        <SectionTitle>Change Password</SectionTitle>
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-4 h-4 text-dark-400" />
          <p className="text-xs text-dark-400 font-mono">
            Update your account password
          </p>
        </div>
        <div>
          <Label required>Current password</Label>
          <div className="relative">
            <Input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-foreground transition-colors"
            >
              {showCurrent ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label required>New password</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-foreground transition-colors"
              >
                {showNew ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <div>
            <Label required>Confirm password</Label>
            <Input
              type={showNew ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              required
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-accent-500/25"
          >
            <Key className="w-4 h-4" />
            Change Password
          </button>
        </div>
      </form>
    </div>
  );
}
