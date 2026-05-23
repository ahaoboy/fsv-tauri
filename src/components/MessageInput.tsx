import { useState, type FormEvent } from "react";
import {
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stack,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { invoke } from "@tauri-apps/api/core";

interface MessageInputProps {
  onMessageSent?: () => void;
}

/**
 * MessageInput — text field + send button that sends a message
 * to the server via the Tauri backend. Handles loading and error states.
 */
export function MessageInput({ onMessageSent }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setError("Message cannot be empty");
      return;
    }

    setIsSending(true);
    setError("");

    try {
      await invoke("send_message", { message: message.trim() });
      setMessage("");
      onMessageSent?.();
    } catch (err: unknown) {
      const msg =
        typeof err === "string"
          ? err
          : (err as Error).message || "Failed to send message";
      setError(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Stack spacing={1.5}>
      <Stack
        direction="row"
        spacing={1}
        component="form"
        onSubmit={handleSubmit}
      >
        <TextField
          fullWidth
          size="small"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={isSending}
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={isSending || !message.trim()}
          startIcon={
            isSending ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <SendIcon />
            )
          }
          sx={{ flexShrink: 0, minWidth: 100 }}
        >
          {isSending ? "Sending..." : "Send"}
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}