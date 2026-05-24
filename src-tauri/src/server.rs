use std::sync::Mutex;
use tauri::State;

use super::ServerInfo;

/// Holds the running server's handle so it stays alive and can be stopped.
pub struct ServerState {
    pub server: Mutex<Option<fsv::Server>>,
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
        let handle = state.server.lock().map_err(|e| e.to_string())?;
        if handle.is_some() {
            let info = state.info.lock().map_err(|e| e.to_string())?;
            if let Some(ref info) = *info {
                return Ok(info.clone());
            }
        }
    }

    let server = fsv::run(fsv::Config {
        port,
        path: path.into(),
    })
    .await
    .map_err(|e| format!("Failed to start server: {}", e))?;

    let info = ServerInfo {
        ips: server.ips.clone(),
        port: server.port,
    };

    {
        let mut handle = state.server.lock().map_err(|e| e.to_string())?;
        *handle = Some(server);
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
    let mut handle = state.server.lock().map_err(|e| e.to_string())?;
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
    let handle = state.server.lock().map_err(|e| e.to_string())?;
    match &*handle {
        Some(server) => {
            println!("Message received: {}", message);
            let _ = server.send(&message);
            Ok(())
        }
        None => Err("Server is not running".to_string()),
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
