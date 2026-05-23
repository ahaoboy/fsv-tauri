import { useState, useCallback, useEffect } from 'preact/hooks';
import { invoke } from '@tauri-apps/api/core';
import './App.css';
import { downloadDir, homeDir } from '@tauri-apps/api/path';

// Import components
import { DirectorySelector } from './components/DirectorySelector';
import { ServerStatus } from './components/ServerStatus';
import { QRCode } from './components/QRCode';
import { MessageInput } from './components/MessageInput';

// Import types
import { ServerInfo } from './types';

// Import API utilities
import { getWsInfo, listDirectoryFiles } from './utils/api';

function App() {
  // State management
  const [path, setPath] = useState('');
  const [port, setPort] = useState('8888');
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [selectedIp, setSelectedIp] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [wsConnected, setWsConnected] = useState<number>(0);
  const isRunning = serverInfo !== null;
  const serverUrl = selectedIp ? `http://${selectedIp}:${serverInfo?.port}` : '';

  // Initialize server status on mount
  useEffect(() => {
    checkServerStatus();
    requestStoragePermission();
  }, []);

  // Request storage permission on Android
  const requestStoragePermission = useCallback(async () => {
    try {
      const granted = await invoke<boolean>('request_storage_permission');
      if (!granted) {
        console.warn('Storage permission was denied by user');
        setError('Storage permission is required to access files');
      } else {
        console.log('Storage permission granted');
      }
    } catch (err) {
      console.error('Failed to request storage permission:', err);
    }
  }, []);

  // When server info changes, default to first IP
  useEffect(() => {
    if (serverInfo && serverInfo.ips.length > 0) {
      setSelectedIp(serverInfo.ips[0]);
    }
  }, [serverInfo]);

  // Poll WebSocket connection info when server is running
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

    // Initial fetch
    pollWsInfo();

    // Poll every 2 seconds
    const interval = setInterval(pollWsInfo, 2000);

    return () => clearInterval(interval);
  }, [isRunning, serverUrl]);

  // Check current server status
  const checkServerStatus = useCallback(async () => {
    try {
      const status = await invoke<ServerInfo | null>('get_server_status');
      setServerInfo(status);
    } catch (err) {
      console.error('Failed to check server status:', err);
    }
  }, []);

  // Start server handler
  const handleStart = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const portNum = parseInt(port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        throw new Error('Port must be between 1 and 65535');
      }

      const info = await invoke<ServerInfo>('start_server', {
        path,
        port: portNum,
      });

      setServerInfo(info);
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err.message || 'Failed to start server');
    } finally {
      setIsLoading(false);
    }
  }, [path, port]);

  // Stop server handler
  const handleStop = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      await invoke('stop_server');
      setServerInfo(null);
      setSelectedIp('');
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err.message || 'Failed to stop server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Copy URL to clipboard
  const handleCopyUrl = useCallback(async () => {
    if (!serverUrl) return;

    try {
      await navigator.clipboard.writeText(serverUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = serverUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [serverUrl]);

  // Handle message sent callback
  const handleMessageSent = useCallback(() => {
    console.log('Message sent successfully');
  }, []);

  return (
    <main class="app-container">
      <div class="content-wrapper">
        {/* Directory Info Bar */}
        <div class="dir-info-bar">
          <span class="label-icon">📂</span>
          <span class="label-name">{path.split(/[\\/]/).filter(Boolean).pop() || path}</span>
          <span class="label-path">{path}</span>
          {isRunning && wsConnected !== undefined && (
            <span class="ws-badge" title={`${wsConnected} WebSocket connection${wsConnected !== 1 ? 's' : ''}`}>
              {wsConnected}
            </span>
          )}
        </div>

        {/* Server Control Card */}
        <section class="control-card">
          {/* Directory + Port - Single Row */}
          <div class="dir-port-row">
            <DirectorySelector
              value={path}
              onChange={setPath}
              disabled={isRunning || isLoading}
            />
            <input
              type="number"
              class="port-input"
              value={port}
              onInput={(e) => setPort(e.currentTarget.value)}
              placeholder="8888"
              min="1"
              max="65535"
              disabled={isRunning || isLoading}
            />
          </div>

          {/* Action Button */}
          <button
            class={`action-btn ${isRunning ? 'stop' : 'start'} ${isLoading ? 'loading' : ''}`}
            onClick={isRunning ? handleStop : handleStart}
            disabled={isLoading}
          >
            {isLoading ? (
              <span class="spinner" />
            ) : (
              <span class="btn-icon">
                {isRunning ? '⏹' : '▶'}
              </span>
            )}
            <span class="btn-text">
              {isLoading ? (isRunning ? 'Stopping...' : 'Starting...') : (isRunning ? 'Stop Server' : 'Start Server')}
            </span>
          </button>

          {/* Error Display */}
          {error && (
            <div class="error-message">
              <span class="error-icon">⚠️</span>
              <span class="error-text">{error}</span>
            </div>
          )}
        </section>

        {/* Server Status Section */}
        {isRunning && serverInfo && (
          <section class="status-card">
            <ServerStatus
              isRunning={isRunning}
              serverInfo={serverInfo}
              selectedIp={selectedIp}
              onIpChange={setSelectedIp}
              onCopyUrl={handleCopyUrl}
              copied={copied}
            />

            {/* QR Code Section */}
            {selectedIp && (
              <div class="qr-section">
                <QRCode url={serverUrl} size={160} />
              </div>
            )}
          </section>
        )}

        {/* Message Input Section */}
        {isRunning && (
          <section class="message-card">
            <MessageInput onMessageSent={handleMessageSent} />
          </section>
        )}
      </div>
    </main>
  );
}

export default App;