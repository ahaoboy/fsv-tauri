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

// Re-export for backward compatibility
export type { ServerInfo as ServerInfoType };