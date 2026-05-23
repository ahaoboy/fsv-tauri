import {
  Container,
  Paper,
  Stack,
  Typography,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Box,
  Divider,
  TextField,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import FolderIcon from "@mui/icons-material/Folder";

import { DirectorySelector } from "./components/DirectorySelector";
import { ServerStatus } from "./components/ServerStatus";
import { QRCode } from "./components/QRCode";
import { MessageInput } from "./components/MessageInput";
import { useServer } from "./hooks/useServer";

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

  // Extract the last segment of the path for display
  const folderName = path.split(/[\\/]/).filter(Boolean).pop() || path;

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
          }}
        >
          <FolderIcon fontSize="small" color="action" />
          <Typography
            variant="body2"
            noWrap
            sx={{ fontWeight: 600, flexShrink: 0, maxWidth: "40%" }}
          >
            {folderName}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{
              flex: 1,
              minWidth: 0,
              fontFamily: "monospace",
            }}
          >
            {path}
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
            {/* Directory + Port in one row */}
            <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <DirectorySelector
                  value={path}
                  onChange={setPath}
                  disabled={isRunning || isLoading}
                />
              </Box>
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
                sx={{ width: 100, flexShrink: 0 }}
              />
            </Stack>

            {/* Start / Stop Button */}
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

            {/* Error Alert */}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </Paper>

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