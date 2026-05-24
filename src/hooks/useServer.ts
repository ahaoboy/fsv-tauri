import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getWsInfo } from "../utils/api";
import type { ServerInfo } from "../types";

/** localStorage key for persisting the selected directory */
const STORAGE_KEY = "fsv_selected_directory";

/** Read the last saved directory from localStorage, or empty string if none */
function getSavedDirectory(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

/** Persist the selected directory to localStorage */
function saveDirectory(dir: string): void {
  try {
    if (dir) {
      localStorage.setItem(STORAGE_KEY, dir);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Silently ignore — may fail in private browsing or storage-full scenarios
  }
}

/**
 * Custom hook that encapsulates all server-related state and actions:
 * - Starting / stopping the server
 * - Tracking server info, selected IP, loading state, errors
 * - Polling WebSocket connection count while the server is running
 * - Copying the server URL to clipboard
 */
export function useServer() {
  const [path, setPath] = useState(getSavedDirectory);
  const [port, setPort] = useState("8888");
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [selectedIp, setSelectedIp] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [wsConnected, setWsConnected] = useState<number>(0);

  const isRunning = serverInfo !== null;
  const serverUrl = selectedIp
    ? `http://${selectedIp}:${serverInfo?.port}`
    : "";

  // Check server status on mount
  useEffect(() => {
    checkServerStatus();
    requestStoragePermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Default to first IP when server info changes
  useEffect(() => {
    if (serverInfo && serverInfo.ips.length > 0) {
      setSelectedIp(serverInfo.ips[0]);
    }
  }, [serverInfo]);

  // Persist selected directory to localStorage whenever it changes
  useEffect(() => {
    saveDirectory(path);
  }, [path]);

  // Poll WebSocket connection info while server is running
  useEffect(() => {
    if (!isRunning || !serverUrl) {
      setWsConnected(0);
      return;
    }

    const pollWsInfo = async () => {
      const info = await getWsInfo(serverUrl);
      if (info) {
        setWsConnected(info.connected);
      }
    };

    pollWsInfo();
    const interval = setInterval(pollWsInfo, 2000);
    return () => clearInterval(interval);
  }, [isRunning, serverUrl]);

  /** Request storage permission on Android via Rust JNI bridge */
  const requestStoragePermission = useCallback(async () => {
    try {
      const granted = await invoke<boolean>("request_storage_permission");
      if (!granted) {
        console.warn("Storage permission was denied by user");
        setError("Storage permission is required to access files");
      }
    } catch (err) {
      console.error("Failed to request storage permission:", err);
      // Non-Android platforms: silently ok
    }
  }, []);

  /** Check current server status from the backend */
  const checkServerStatus = useCallback(async () => {
    try {
      const status = await invoke<ServerInfo | null>("get_server_status");
      setServerInfo(status);
    } catch (err) {
      console.error("Failed to check server status:", err);
    }
  }, []);

  /** Start the file server */
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
    } catch (err: unknown) {
      const message =
        typeof err === "string"
          ? err
          : (err as Error).message || "Failed to start server";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [path, port]);

  /** Stop the file server */
  const handleStop = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      await invoke("stop_server");
      setServerInfo(null);
      setSelectedIp("");
    } catch (err: unknown) {
      const message =
        typeof err === "string"
          ? err
          : (err as Error).message || "Failed to stop server";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** Copy the server URL to clipboard */
  const handleCopyUrl = useCallback(async () => {
    if (!serverUrl) return;

    try {
      await navigator.clipboard.writeText(serverUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers / non-HTTPS contexts
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

  /** Callback when a message is sent via WebSocket */
  const handleMessageSent = useCallback(() => {
    console.log("Message sent successfully");
  }, []);

  return {
    // State
    path,
    port,
    serverInfo,
    selectedIp,
    isLoading,
    error,
    copied,
    wsConnected,
    isRunning,
    serverUrl,
    // Actions
    setPath,
    setPort,
    setSelectedIp,
    handleStart,
    handleStop,
    handleCopyUrl,
    handleMessageSent,
  };
}
