// Utility functions for directory management using Tauri backend API

import { invoke } from '@tauri-apps/api/core';
import { DirectoryInfo } from '../types';

/**
 * Get available directories from the system using Tauri backend
 * Backend filters out empty directories and directories without access permissions
 * @returns Promise resolving to array of directory info
 */
export const getDirectoryOptions = async (): Promise<DirectoryInfo[]> => {
  try {
    // Call the Rust backend to get validated system directories
    // Backend already filters out empty and inaccessible directories
    const directories = await invoke<DirectoryInfo[]>('get_available_directories');
    return directories;
  } catch (error) {
    console.error('Failed to get directories from backend:', error);
    // Return empty array if backend fails
    return [];
  }
};

/**
 * Format path for display
 * @param path - The absolute path to format
 * @returns Formatted path string
 */
export const formatPath = (path: string): string => {
  if (!path) return 'Not selected';
  
  // Try to get the last component of the path
  const pathParts = path.split(/[\\/]/);
  if (pathParts.length > 0) {
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart) {
      return lastPart;
    }
  }
  
  // If we can't get a nice name, return the full path truncated
  if (path.length > 30) {
    return '...' + path.slice(-27);
  }
  
  return path;
};

/**
 * Get the default directory (usually home or current)
 * @returns Promise resolving to default directory path
 */
export const getDefaultDirectory = async (): Promise<string> => {
  try {
    const directories = await getDirectoryOptions();
    
    // Try to find home directory first
    const homeDir = directories.find(dir => dir.name === 'Home');
    if (homeDir) {
      return homeDir.path;
    }
    
    // Fallback to current directory
    const currentDir = directories.find(dir => dir.name === 'Current Folder');
    if (currentDir) {
      return currentDir.path;
    }
    
    // Fallback to first available directory
    if (directories.length > 0) {
      return directories[0].path;
    }
    
    // Ultimate fallback
    return '.';
  } catch (error) {
    console.error('Failed to get default directory:', error);
    return '.';
  }
};
