import { WsInfo, HealthStatus } from '../types';

/**
 * Normalize API base URL
 */
function base(apiBase: string): string {
  return apiBase.replace(/\/$/, '');
}

/**
 * Fetch WebSocket connection statistics
 */
export async function getWsInfo(apiBase: string): Promise<WsInfo> {
  const url = `${base(apiBase)}/ws-info`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Check server health
 */
export async function checkHealth(apiBase: string): Promise<HealthStatus> {
  const url = `${base(apiBase)}/health`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
