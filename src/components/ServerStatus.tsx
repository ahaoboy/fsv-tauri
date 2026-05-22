import { ServerInfo } from '../types';
import { openUrl } from "@tauri-apps/plugin-opener";

interface ServerStatusProps {
  isRunning: boolean;
  serverInfo: ServerInfo | null;
  selectedIp: string;
  onIpChange: (ip: string) => void;
  onCopyUrl: () => void;
  copied: boolean;
}

/**
 * ServerStatus component for displaying server information
 * Shows IP:port selector with copy and open buttons in a single line
 */
export function ServerStatus({
  isRunning,
  serverInfo,
  selectedIp,
  onIpChange,
  onCopyUrl,
  copied
}: ServerStatusProps) {
  if (!isRunning || !serverInfo) {
    return null;
  }

  const serverUrl = `http://${selectedIp}:${serverInfo.port}`;

  const handleOpenUrl = () => {
    openUrl(serverUrl);
  };

  return (
    <div class="server-status">
      <div class="ip-selector">
        <select
          class="ip-select"
          value={selectedIp}
          onChange={(e) => onIpChange(e.currentTarget.value)}
        >
          {serverInfo.ips.map((ip) => (
            <option key={ip} value={ip}>
              {ip}:{serverInfo.port}
            </option>
          ))}
        </select>
        <button
          class={`copy-btn ${copied ? 'copied' : ''}`}
          onClick={onCopyUrl}
          title={copied ? 'Copied!' : 'Copy URL'}
        >
          {copied ? '✓' : '📋'}
        </button>
        <button
          class="open-btn"
          onClick={handleOpenUrl}
          title="Open in browser"
        >
          🔗
        </button>
      </div>
    </div>
  );
}