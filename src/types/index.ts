// Type definitions for the FSV Server application

export interface ServerInfo {
  ips: string[];
  port: number;
}

export interface DirectoryInfo {
  name: string;
  path: string;
  icon: string;
}

export interface Message {
  id: string;
  text: string;
  timestamp: Date;
}

/** WebSocket connection info */
export interface WsInfo {
  connected: number;
  broadcast_capacity: number;
}

/** Health check response */
export interface HealthStatus {
  status: string;
  timestamp: number;
}

// Re-export for backward compatibility
export type { ServerInfo as ServerInfoType };