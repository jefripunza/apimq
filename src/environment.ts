export const env = (import.meta.env || {}) as Record<string, string>;
export let HOST_API = env.VITE_HOST_API || "";
if (window.location.hostname.includes("devtunnels.ms")) {
  HOST_API = "https://t7wxxqtb-1234.asse.devtunnels.ms";
}
