import {
  Box,
  Container,
  Paper,
  Stack,
  Typography,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  TextField,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import FolderIcon from "@mui/icons-material/Folder";
import { open } from "@tauri-apps/plugin-dialog";
import { platform } from "@tauri-apps/plugin-os";
import { openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";

import { DirectorySelector } from "./components/DirectorySelector";
import { ServerStatus } from "./components/ServerStatus";
import { QRCode } from "./components/QRCode";
import { MessageInput } from "./components/MessageInput";
import { useServer } from "./hooks/useServer";
import { useState, useCallback, useEffect } from "react";

/**
 * App — root component for the FSV (File Server Viewer) application.
 *
 * Layout (mobile-first):
 * 1. Directory info bar with folder name, path, and WebSocket badge
 * 2. Server control card — directory selector + port + start/stop button
 * 3. Server status card — IP selector, copy & open buttons, QR code
 * 4. Message input card — text field + send button for WebSocket messages
 */
function App() {
  const {
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
    setPath,
    setPort,
    setSelectedIp,
    handleStart,
    handleStop,
    handleCopyUrl,
    handleMessageSent,
  } = useServer();

  // Browse folder dialog (desktop only)
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [osPlatform, setOsPlatform] = useState<string>("unknown");
  const isMobile = osPlatform === "android" || osPlatform === "ios";

  // Detect platform on mount
  useEffect(() => {
    try {
      setOsPlatform(platform());
    } catch {
      /* keep unknown */
    }
  }, []);

  const handleBrowse = useCallback(async () => {
    setIsBrowsing(true);
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select a folder to serve",
      });
      if (selected && typeof selected === "string") {
        setPath(selected);
      }
    } catch (err) {
      console.error("Native folder picker failed:", err);
    } finally {
      setIsBrowsing(false);
    }
  }, [setPath]);

  // Full path for info bar (CSS noWrap handles overflow)
  const pathLabel = path;

  // Click path: desktop opens in file explorer, mobile copies to clipboard
  const handleClickPath = useCallback(async () => {
    if (!path) return;
    if (isMobile) {
      try {
        await navigator.clipboard.writeText(path);
      } catch {
        const textArea = document.createElement("textarea");
        textArea.value = path;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
    } else {
      try {
        await revealItemInDir(path);
      } catch {
        console.error("Failed to reveal in file explorer:", path);
      }
    }
  }, [path, isMobile]);

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Stack spacing={1.5}>
        {/* ---- Directory Info Bar ---- */}
        <Paper
          variant="outlined"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 0.75,
            overflow: "hidden",
          }}
        >
          <FolderIcon fontSize="small" color="action" />
          <Typography
            variant="caption"
            noWrap
            onClick={handleClickPath}
            title={isMobile ? "Click to copy path" : "Click to open in file explorer"}
            sx={{
              flex: 1,
              minWidth: 0,
              fontFamily: "monospace",
              cursor: "pointer",
              "&:hover": { color: "primary.main" },
            }}
          >
            {pathLabel}
          </Typography>
          {isRunning && wsConnected !== undefined && (
            <Chip
              label={wsConnected}
              size="small"
              color="success"
              variant="outlined"
              title={`${wsConnected} WebSocket connection${wsConnected !== 1 ? "s" : ""}`}
              sx={{ ml: "auto", flexShrink: 0 }}
            />
          )}
        </Paper>

        {/* ---- Server Control Card ---- */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            {/* Directory — full width, browse icon inside */}
            <DirectorySelector
              value={path}
              onChange={setPath}
              disabled={isRunning || isLoading}
              mode={isMobile ? "mobile" : "desktop"}
              onBrowse={isMobile ? undefined : handleBrowse}
              isBrowsing={isBrowsing}
            />

            {/* Port + Start/Stop in one row */}
            <Stack direction="row" spacing={1}>
              <TextField
                type="number"
                size="small"
                label="Port"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                disabled={isRunning || isLoading}
                slotProps={{
                  htmlInput: { min: 1, max: 65535 },
                }}
                sx={{ width: 96, flexShrink: 0 }}
              />
              <Button
                fullWidth
                variant="contained"
                color={isRunning ? "error" : "primary"}
                onClick={isRunning ? handleStop : handleStart}
                disabled={isLoading}
                startIcon={
                  isLoading ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : isRunning ? (
                    <StopIcon />
                  ) : (
                    <PlayArrowIcon />
                  )
                }
              >
                {isLoading
                  ? isRunning
                    ? "Stopping..."
                    : "Starting..."
                  : isRunning
                    ? "Stop Server"
                    : "Start Server"}
              </Button>
            </Stack>

            {/* Error Alert */}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </Paper>

        {/* ---- Logo (shown when server is stopped) ---- */}
        {!isRunning && (
          <Box
            onClick={() => openUrl("https://github.com/ahaoboy/fsv-tauri")}
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flex: 1,
              cursor: "pointer",
              opacity: 0.7,
              transition: "opacity 0.2s",
              "&:hover": { opacity: 1 },
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <Box
              component="img"
              src="/icon.png"
              alt="FSV"
              sx={{
                width: "80%",
                height: "auto",
                borderRadius: "20%",
              }}
            />
          </Box>
        )}

        {/* ---- Server Status Card ---- */}
        {isRunning && serverInfo && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <ServerStatus
                isRunning={isRunning}
                serverInfo={serverInfo}
                selectedIp={selectedIp}
                onIpChange={setSelectedIp}
                onCopyUrl={handleCopyUrl}
                copied={copied}
              />

              {/* QR Code */}
              {selectedIp && (
                <>
                  <Divider />
                  <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <QRCode url={serverUrl} size={160} />
                  </Box>
                </>
              )}
            </Stack>
          </Paper>
        )}

        {/* ---- Message Input Card ---- */}
        {isRunning && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <MessageInput onMessageSent={handleMessageSent} />
          </Paper>
        )}
      </Stack>
    </Container>
  );
}

export default App;
