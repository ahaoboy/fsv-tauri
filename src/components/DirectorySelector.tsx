import { useState, useEffect } from "react";
import {
  TextField,
  IconButton,
  InputAdornment,
  CircularProgress,
  FormControl,
  Select,
  MenuItem,
  Alert,
  AlertTitle,
  Button,
  Typography,
  Box,
} from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { getDirectoryOptions, getDefaultDirectory } from "../utils/directories";
import type { DirectoryInfo } from "../types";
import type { SelectChangeEvent } from "@mui/material";

interface DirectorySelectorProps {
  value: string;
  onChange: (path: string) => void;
  disabled?: boolean;
  /** Desktop only: triggers native folder picker */
  onBrowse?: () => void;
  isBrowsing?: boolean;
  /** 'desktop' = native dialog with browse icon; 'mobile' = dropdown */
  mode?: "desktop" | "mobile";
}

/**
 * DirectorySelector — adapts between desktop (native folder picker)
 * and mobile (backend directory dropdown).
 */
export function DirectorySelector({
  value,
  onChange,
  disabled = false,
  onBrowse,
  isBrowsing = false,
  mode = "desktop",
}: DirectorySelectorProps) {
  if (mode === "mobile") {
    return <MobileDirectorySelector value={value} onChange={onChange} disabled={disabled} />;
  }

  return (
    <TextField
      fullWidth
      size="small"
      value={value || ""}
      disabled={disabled}
      slotProps={{
        input: {
          readOnly: true,
          endAdornment: onBrowse ? (
            <InputAdornment position="end">
              <IconButton
                onClick={onBrowse}
                disabled={disabled || isBrowsing}
                size="small"
                edge="end"
              >
                {isBrowsing ? <CircularProgress size={20} /> : <FolderOpenIcon />}
              </IconButton>
            </InputAdornment>
          ) : undefined,
        },
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Mobile variant — dropdown backed by Tauri backend directory list
// ---------------------------------------------------------------------------

function MobileDirectorySelector({
  value,
  onChange,
  disabled = false,
}: Omit<DirectorySelectorProps, "onBrowse" | "isBrowsing" | "mode">) {
  const [options, setOptions] = useState<DirectoryInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDirectories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDirectories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const directoryOptions = await getDirectoryOptions();
      setOptions(directoryOptions);

      if (directoryOptions.length > 0) {
        if (!value) {
          const defaultDir = await getDefaultDirectory();
          onChange(defaultDir);
        } else {
          const valueExists = directoryOptions.some((opt) => opt.path === value);
          if (!valueExists) {
            const defaultDir = await getDefaultDirectory();
            onChange(defaultDir);
          }
        }
      }
    } catch (err: unknown) {
      setError("Failed to load directories");
      console.error("Error loading directories:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: SelectChangeEvent<string>) => {
    onChange(e.target.value);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1 }}>
        <CircularProgress size={18} />
        <Typography variant="body2" color="text.secondary">
          Loading directories...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={loadDirectories}>
            Retry
          </Button>
        }
      >
        <AlertTitle>Error</AlertTitle>
        {error}
      </Alert>
    );
  }

  if (options.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        No accessible directories found
      </Typography>
    );
  }

  return (
    <FormControl fullWidth size="small" disabled={disabled}>
      <Select
        value={value || options[0]?.path || ""}
        onChange={handleChange}
        renderValue={(selected) => {
          const opt = options.find((o) => o.path === selected);
          return (
            <Typography noWrap variant="body2">
              {opt?.name ?? selected}
            </Typography>
          );
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.path} value={option.path}>
            <Typography noWrap sx={{ maxWidth: "60%" }}>
              {option.name}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ flex: 1, ml: 1, minWidth: 0 }}
            >
              {option.path}
            </Typography>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
