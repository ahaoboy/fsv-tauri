use std::sync::Mutex;
use tauri::State;

use super::ServerInfo;

/// Holds the running server's handle so it stays alive and can be stopped.
pub struct ServerState {
    pub handle: Mutex<Option<fsv::ServerHandle>>,
    pub info: Mutex<Option<ServerInfo>>,
}

/// Start the file server on the given path and port.
/// Returns the list of local IPs and actual port used.
#[tauri::command]
pub async fn start_server(
    path: String,
    port: u16,
    state: State<'_, ServerState>,
) -> Result<ServerInfo, String> {
    // Check if server is already running
    {
        let handle = state.handle.lock().map_err(|e| e.to_string())?;
        if handle.is_some() {
            let info = state.info.lock().map_err(|e| e.to_string())?;
            if let Some(ref info) = *info {
                return Ok(info.clone());
            }
        }
    }

    let (ips, actual_port, join_handle) = fsv::run(fsv::Config {
        port,
        path: path.into(),
    })
    .await
    .map_err(|e| format!("Failed to start server: {}", e))?;

    let info = ServerInfo {
        ips,
        port: actual_port,
    };

    {
        let mut handle = state.handle.lock().map_err(|e| e.to_string())?;
        *handle = Some(join_handle);
    }
    {
        let mut stored_info = state.info.lock().map_err(|e| e.to_string())?;
        *stored_info = Some(info.clone());
    }

    Ok(info)
}

/// Stop the running file server.
#[tauri::command]
pub async fn stop_server(state: State<'_, ServerState>) -> Result<(), String> {
    let mut handle = state.handle.lock().map_err(|e| e.to_string())?;
    if let Some(mut h) = handle.take() {
        let _ = h.shutdown();
    }
    let mut info = state.info.lock().map_err(|e| e.to_string())?;
    *info = None;
    Ok(())
}

/// Send a broadcast message to all connected WebSocket clients.
#[tauri::command]
pub async fn send_message(
    state: State<'_, ServerState>,
    message: String,
) -> Result<(), String> {
    let mut handle = state.handle.lock().map_err(|e| e.to_string())?;

    if let Some(h) = handle.take() {
        println!("Message received: {}", message);
        let _ = h.send(&message);
        *handle = Some(h);
        Ok(())
    } else {
        Err("Server is not running".to_string())
    }
}

/// Query the current server status.
#[tauri::command]
pub async fn get_server_status(
    state: State<'_, ServerState>,
) -> Result<Option<ServerInfo>, String> {
    let info = state.info.lock().map_err(|e| e.to_string())?;
    Ok(info.clone())
}
