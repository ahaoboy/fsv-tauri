import { WsInfo, HealthStatus, FileInfo } from "../types";
import { invoke } from "@tauri-apps/api/core";

/**
 * Normalize API base URL
 */
function base(apiBase: string): string {
  return apiBase.replace(/\/$/, "");
}

/**
 * Fetch WebSocket connection statistics
 */
export async function getWsInfo(apiBase: string): Promise<WsInfo | undefined> {
  try {
    const url = `${base(apiBase)}/ws-info`;
    const res = await fetch(url, { method: "POST" });
    if (!res.ok) return undefined;
    return res.json();
  } catch (error) {
    console.error("getWsInfo failed:", error);
    return undefined;
  }
}

/**
 * Check server health
 */
export async function checkHealth(apiBase: string): Promise<HealthStatus | undefined> {
  try {
    const url = `${base(apiBase)}/health`;
    const res = await fetch(url, { method: "POST" });
    if (!res.ok) return undefined;
    return res.json();
  } catch (error) {
    console.error("checkHealth failed:", error);
    return undefined;
  }
}

/**
 * List files in a directory
 */
export async function listDirectoryFiles(directoryPath: string): Promise<FileInfo[]> {
  return invoke<FileInfo[]>("list_directory_files", { directoryPath });
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
}

/**
 * Format timestamp to date string
 */
export function formatDate(timestamp?: number): string {
  if (!timestamp) return "Unknown";

  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
}

/**
 * Get file type icon
 */
export function getFileTypeIcon(fileType: string, isDirectory: boolean): string {
  if (isDirectory) return "📁";

  const iconMap: Record<string, string> = {
    // Images
    jpg: "🖼️",
    jpeg: "🖼️",
    png: "🖼️",
    gif: "🖼️",
    svg: "🖼️",
    webp: "🖼️",
    bmp: "🖼️",
    ico: "🖼️",

    // Videos
    mp4: "🎬",
    avi: "🎬",
    mkv: "🎬",
    mov: "🎬",
    wmv: "🎬",
    flv: "🎬",
    webm: "🎬",

    // Audio
    mp3: "🎵",
    wav: "🎵",
    flac: "🎵",
    aac: "🎵",
    ogg: "🎵",
    m4a: "🎵",
    wma: "🎵",

    // Documents
    pdf: "📄",
    doc: "📄",
    docx: "📄",
    txt: "📄",
    rtf: "📄",
    odt: "📄",

    // Spreadsheets
    xls: "📊",
    xlsx: "📊",
    csv: "📊",
    ods: "📊",

    // Presentations
    ppt: "📊",
    pptx: "📊",
    odp: "📊",

    // Archives
    zip: "📦",
    rar: "📦",
    "7z": "📦",
    tar: "📦",
    gz: "📦",
    bz2: "📦",

    // Code
    js: "📝",
    ts: "📝",
    jsx: "📝",
    tsx: "📝",
    html: "📝",
    css: "📝",
    json: "📝",
    xml: "📝",
    py: "📝",
    java: "📝",
    cpp: "📝",
    c: "📝",
    rs: "📝",
    go: "📝",
    php: "📝",
    rb: "📝",

    // Executables
    exe: "⚙️",
    apk: "📱",
    app: "📱",
    dmg: "💿",
    iso: "💿",

    // Default
    file: "📄",
  };

  return iconMap[fileType.toLowerCase()] || "📄";
}
