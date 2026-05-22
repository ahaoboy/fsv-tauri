import { useState, useCallback, useEffect } from "preact/hooks";
import { invoke } from "@tauri-apps/api/core";
import QRCodeLib from "qrcode";
import "./App.css";

interface ServerInfo {
  ip: string[];
  port: number;
}

function QRCode({ url, size = 256 }: { url: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    if (!url) return;
    QRCodeLib.toDataURL(url, {
      width: size,
    })
      .then(setDataUrl)
      .catch(console.error);
  }, [url, size]);

  if (!dataUrl) return <div class="qr-wrapper qr-placeholder" style={{ width: size, height: size }} />;

  return (
    <div class="qr-wrapper">
      <img src={dataUrl} width={size} height={size} alt={`QR code for ${url}`} class="qr-image" />
    </div>
  );
}

function App() {
  const [path, setPath] = useState(".");
  const [port, setPort] = useState("8888");
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [selectedIp, setSelectedIp] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const isRunning = serverInfo !== null;

  // When server info changes, default to first IP
  useEffect(() => {
    if (serverInfo && serverInfo.ip.length > 0) {
      setSelectedIp(serverInfo.ip[0]);
    }
  }, [serverInfo]);

  const handleStart = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const portNum = parseInt(port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        throw new Error("Port must be between 1 and 65535");
      }
      const info = await invoke<ServerInfo>("start_server", {
        path,
        port: portNum,
      });
      setServerInfo(info);
    } catch (e: any) {
      setError(typeof e === "string" ? e : e.message || "Failed to start server");
    } finally {
      setIsLoading(false);
    }
  }, [path, port]);

  const handleStop = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      await invoke("stop_server");
      setServerInfo(null);
      setSelectedIp("");
    } catch (e: any) {
      setError(typeof e === "string" ? e : e.message || "Failed to stop server");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const serverUrl = selectedIp
    ? `http://${selectedIp}:${serverInfo?.port}`
    : "";

  const handleCopy = useCallback(async () => {
    if (!serverUrl) return;
    try {
      await navigator.clipboard.writeText(serverUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = serverUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [serverUrl]);

  return (
    <main class="app-container">
      {/* Header */}
      <header class="app-header">
        <svg
          class="app-logo"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#logo-gradient)" opacity="0.15" />
          <rect x="4" y="4" width="56" height="56" rx="14" stroke="url(#logo-gradient)" stroke-width="1.5" />
          <path d="M20 22h24v4H20zM20 30h18v4H20zM20 38h22v4H20z" fill="url(#logo-gradient)" opacity="0.8" />
          <circle cx="46" cy="42" r="6" fill="#34d399" opacity="0.9" />
          <defs>
            <linearGradient id="logo-gradient" x1="4" y1="4" x2="60" y2="60">
              <stop stop-color="#818cf8" />
              <stop offset="1" stop-color="#c084fc" />
            </linearGradient>
          </defs>
        </svg>
        <h1 class="app-title">FSV Server</h1>
        <p class="app-subtitle">Static file server powered by Tauri</p>
      </header>

      {/* Main Card */}
      <section class="server-card" id="server-card">
        {/* Status Badge */}
        <div class={`status-badge ${isRunning ? "status-online" : "status-offline"}`} id="status-badge">
          <span class="status-dot" />
          {isRunning ? "Server Running" : "Server Stopped"}
        </div>

        {/* Path + Port Inputs */}
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="path-input">
              <span class="label-icon">📂</span>
              Directory
            </label>
            <input
              id="path-input"
              class="form-input"
              type="text"
              value={path}
              onInput={(e) => setPath(e.currentTarget.value)}
              placeholder="./public"
              disabled={isRunning || isLoading}
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="port-input">
              <span class="label-icon">🔌</span>
              Port
            </label>
            <input
              id="port-input"
              class="form-input port-input"
              type="number"
              value={port}
              onInput={(e) => setPort(e.currentTarget.value)}
              placeholder="8888"
              min="1"
              max="65535"
              disabled={isRunning || isLoading}
            />
          </div>
        </div>

        {/* Action Button */}
        {isRunning ? (
          <button
            id="stop-btn"
            class={`action-btn btn-stop ${isLoading ? "btn-loading" : ""}`}
            onClick={handleStop}
            disabled={isLoading}
          >
            {isLoading ? <span class="spinner" /> : <span class="btn-icon">⏹</span>}
            {isLoading ? "Stopping..." : "Stop Server"}
          </button>
        ) : (
          <button
            id="start-btn"
            class={`action-btn btn-start ${isLoading ? "btn-loading" : ""}`}
            onClick={handleStart}
            disabled={isLoading}
          >
            {isLoading ? <span class="spinner" /> : <span class="btn-icon">▶</span>}
            {isLoading ? "Starting..." : "Start Server"}
          </button>
        )}

        {/* Error */}
        {error && (
          <div class="error-msg" id="error-msg">
            <span class="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Server Info */}
        {isRunning && serverInfo && (
          <div class="status-section">
            <div class="separator" />

            {/* IP Selector */}
            <div class="form-group">
              <label class="form-label" for="ip-select">
                <span class="label-icon">🌐</span>
                Network Interface
              </label>
              <select
                id="ip-select"
                class="form-input form-select"
                value={selectedIp}
                onChange={(e) => setSelectedIp(e.currentTarget.value)}
              >
                {serverInfo.ip.map((ip) => (
                  <option key={ip} value={ip}>{ip}</option>
                ))}
              </select>
            </div>

            {/* URL + Copy */}
            {selectedIp && (
              <div class="url-row">
                <a
                  class="server-url-link"
                  href={serverUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="server-url"
                >
                  {serverUrl}
                </a>
                <button
                  id="copy-btn"
                  class={`copy-btn ${copied ? "copied" : ""}`}
                  onClick={handleCopy}
                  title="Copy URL"
                >
                  {copied ? "✓" : "📋"}
                </button>
              </div>
            )}

            {/* QR Code */}
            {selectedIp && (
              <div class="qr-section">
                <p class="qr-label">Scan to open on mobile</p>
                <QRCode url={serverUrl} size={180} />
              </div>
            )}

            {/* Serving path */}
            <div class="serving-row">
              <span class="info-label">📁 Serving</span>
              <span class="info-value">{path}</span>
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer class="app-footer">
        <p>
          Built with{" "}
          <a href="https://tauri.app" target="_blank" rel="noopener noreferrer">Tauri</a>
          {" "}+{" "}
          <a href="https://preactjs.com" target="_blank" rel="noopener noreferrer">Preact</a>
          {" "}+{" "}
          <a href="https://crates.io/crates/fsv" target="_blank" rel="noopener noreferrer">FSV</a>
        </p>
      </footer>
    </main>
  );
}

export default App;
