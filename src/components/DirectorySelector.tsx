import { useState, useEffect } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  AlertTitle,
  Button,
  Typography,
  Box,
} from "@mui/material";
import { getDirectoryOptions, getDefaultDirectory } from "../utils/directories";
import type { DirectoryInfo } from "../types";
import type { SelectChangeEvent } from "@mui/material";

interface DirectorySelectorProps {
  value: string;
  onChange: (path: string) => void;
  disabled?: boolean;
}

/**
 * DirectorySelector — renders a dropdown of available directories
 * provided by the Tauri backend. Handles loading, error, and empty states.
 */
export function DirectorySelector({
  value,
  onChange,
  disabled = false,
}: DirectorySelectorProps) {
  const [options, setOptions] = useState<DirectoryInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load directories on mount
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
          const valueExists = directoryOptions.some(
            (opt) => opt.path === value,
          );
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

  // Loading state
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

  // Error state
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

  // Empty state
  if (options.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        No accessible directories found
      </Typography>
    );
  }

  // Normal state — dropdown
  return (
    <FormControl fullWidth size="small" disabled={disabled}>
      <InputLabel id="directory-select-label">Directory</InputLabel>
      <Select
        labelId="directory-select-label"
        value={value || options[0]?.path || ""}
        label="Directory"
        onChange={handleChange}
      >
        {options.map((option) => (
          <MenuItem key={option.path} value={option.path}>
            {option.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}