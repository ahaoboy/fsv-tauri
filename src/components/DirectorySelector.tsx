import { useState, useEffect } from 'preact/hooks';
import { getDirectoryOptions, getDefaultDirectory } from '../utils/directories';
import { DirectoryInfo } from '../types';

interface DirectorySelectorProps {
  value: string;
  onChange: (path: string) => void;
  disabled?: boolean;
}

/**
 * DirectorySelector component for selecting common directories
 * Uses Tauri backend to get actual system directories
 * @param value - The currently selected path
 * @param onChange - Callback when directory changes
 * @param disabled - Whether the selector is disabled
 * @param wsConnected - Number of connected WebSocket clients
 */
export function DirectorySelector({ value, onChange, disabled = false }: DirectorySelectorProps) {
  const [options, setOptions] = useState<DirectoryInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load directories on component mount
  useEffect(() => {
    loadDirectories();
  }, []);

  const loadDirectories = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const directoryOptions = await getDirectoryOptions();
      setOptions(directoryOptions);

      // Always set default directory if value is empty or not in options
      if (directoryOptions.length > 0) {
        if (!value) {
          const defaultDir = await getDefaultDirectory();
          onChange(defaultDir);
        } else {
          // Check if current value exists in options, if not, set to default
          const valueExists = directoryOptions.some(opt => opt.path === value);
          if (!valueExists) {
            const defaultDir = await getDefaultDirectory();
            onChange(defaultDir);
          }
        }
      }
    } catch (err: any) {
      setError('Failed to load directories');
      console.error('Error loading directories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    onChange(target.value);
  };

  const handleRetry = () => {
    loadDirectories();
  };

  if (isLoading) {
    return (
      <div class="directory-selector">
        <div class="selector-loading">
          <span class="spinner small" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div class="directory-selector">
        <div class="selector-error">
          <span class="error-icon">⚠️</span>
          <span class="error-text">{error}</span>
          <button class="retry-btn" onClick={handleRetry}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div class="directory-selector">
        <div class="selector-empty">
          <span>No accessible directories found</span>
        </div>
      </div>
    );
  }

  return (
    <div class="directory-selector">
      <select
        class="selector-input"
        value={value || options[0]?.path || ''}
        onChange={handleChange}
        disabled={disabled}
      >
        {options.map((option: DirectoryInfo) => (
          <option key={option.path} value={option.path}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}