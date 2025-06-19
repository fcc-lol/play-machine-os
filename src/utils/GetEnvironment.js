export const getEnvironmentFromUrl = () => {
  // Check for explicit environment override via URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const envOverride = urlParams.get("server");

  if (envOverride === "local" || envOverride === "production") {
    return envOverride;
  }

  // Fall back to hostname-based detection
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  return isLocalhost ? "local" : "production";
};
