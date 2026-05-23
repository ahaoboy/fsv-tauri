import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Stack,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { ServerInfo } from "../types";
import type { SelectChangeEvent } from "@mui/material";

interface ServerStatusProps {
  isRunning: boolean;
  serverInfo: ServerInfo | null;
  selectedIp: string;
  onIpChange: (ip: string) => void;
  onCopyUrl: () => void;
  copied: boolean;
}

/**
 * ServerStatus — displays the selected IP:port with copy and open-in-browser
 * action buttons in a single compact row.
 */
export function ServerStatus({
  isRunning,
  serverInfo,
  selectedIp,
  onIpChange,
  onCopyUrl,
  copied,
}: ServerStatusProps) {
  if (!isRunning || !serverInfo) {
    return null;
  }

  const serverUrl = `http://${selectedIp}:${serverInfo.port}`;

  const handleOpenUrl = () => {
    openUrl(serverUrl);
  };

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <FormControl fullWidth size="small">
        <InputLabel id="ip-select-label">Server Address</InputLabel>
        <Select
          labelId="ip-select-label"
          value={selectedIp}
          label="Server Address"
          onChange={(e: SelectChangeEvent<string>) =>
            onIpChange(e.target.value)
          }
        >
          {serverInfo.ips.map((ip) => (
            <MenuItem key={ip} value={ip}>
              {ip}:{serverInfo.port}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <IconButton
        onClick={onCopyUrl}
        color={copied ? "success" : "default"}
        title={copied ? "Copied!" : "Copy URL"}
        size="small"
        sx={{ border: 1, borderColor: "divider" }}
      >
        {copied ? (
          <CheckIcon fontSize="small" />
        ) : (
          <ContentCopyIcon fontSize="small" />
        )}
      </IconButton>

      <IconButton
        onClick={handleOpenUrl}
        color="primary"
        title="Open in browser"
        size="small"
        sx={{ border: 1, borderColor: "divider" }}
      >
        <OpenInNewIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}