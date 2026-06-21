use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Emitter, Manager, State};

use super::ServerInfo;

/// Holds the running server's handle so it stays alive and can be stopped.
pub struct ServerState {
    pub server: Mutex<Option<fsv::Server>>,
    pub info: Mutex<Option<ServerInfo>>,
    /// Set to `true` just before an intentional shutdown so the background
    /// watcher can skip its own cleanup and avoid a double‑emit race.
    pub shutting_down: AtomicBool,
}

/// Start the file server on the given path and port.
/// Returns the list of local IPs and actual port used.
#[tauri::command]
pub async fn start_server(
    app: tauri::AppHandle,
    path: String,
    port: u16,
    state: State<'_, ServerState>,
) -> Result<ServerInfo, String> {
    tracing::info!(%path, %port, "start_server requested");

    // Check if server is already running
    {
        let handle = state.server.lock().map_err(|e| e.to_string())?;
        if handle.is_some() {
            let info = state.info.lock().map_err(|e| e.to_string())?;
            if let Some(ref info) = *info {
                tracing::info!("Server already running on port {}", info.port);
                return Ok(info.clone());
            }
        }
    }

    // Reset the intentional‑shutdown flag (from any previous session).
    state.shutting_down.store(false, Ordering::SeqCst);

    let server = fsv::run(fsv::Config {
        port,
        path: path.clone().into(),
    })
    .await
    .map_err(|e| {
        tracing::error!(%path, %port, error = %e, "Failed to start server");
        format!("Failed to start server: {}", e)
    })?;

    let info = ServerInfo {
        ips: server.ips.clone(),
        port: server.port,
    };

    tracing::info!(
        port = info.port,
        ips = ?info.ips,
        "Server started successfully"
    );

    // Clone the shutdown notifier before storing the server handle.
    // When the server process exits (crash, port conflict, etc.) the
    // Notify will fire and we can synchronise Tauri state automatically.
    let shutdown_notify = server.shutdown_notify.clone();

    {
        let mut handle = state.server.lock().map_err(|e| e.to_string())?;
        *handle = Some(server);
    }
    {
        let mut stored_info = state.info.lock().map_err(|e| e.to_string())?;
        *stored_info = Some(info.clone());
    }

    // Background watcher: if the server shuts down on its own,
    // clear Tauri state and tell the frontend.
    let watcher_port = info.port;
    tokio::spawn(async move {
        shutdown_notify.notified().await;

        tracing::warn!(
            port = watcher_port,
            "Server shutdown detected (unexpected or external)"
        );

        let state = app.state::<ServerState>();

        // If stop_server() set this flag, it already handled cleanup
        // and will return the invoke callback — don't race with it.
        if state.shutting_down.swap(false, Ordering::SeqCst) {
            tracing::debug!("Shutdown already handled by stop_server, skipping watcher cleanup");
            return;
        }

        // Clear state (use ok() to avoid panics on poisoned mutexes).
        if let Ok(mut handle) = state.server.lock() {
            *handle = None;
        }
        if let Ok(mut info) = state.info.lock() {
            *info = None;
        }

        let _ = app.emit("server-stopped", ());
    });

    Ok(info)
}

/// Stop the running file server.
#[tauri::command]
pub async fn stop_server(
    app: tauri::AppHandle,
    state: State<'_, ServerState>,
) -> Result<(), String> {
    tracing::info!("stop_server requested");

    // Signal the background watcher that *we* are handling the shutdown.
    state.shutting_down.store(true, Ordering::SeqCst);

    let mut handle = state.server.lock().map_err(|e| e.to_string())?;
    if let Some(mut h) = handle.take() {
        tracing::info!("Shutting down server");
        let _ = h.shutdown();
    } else {
        tracing::debug!("stop_server called but no server was running");
    }
    let mut info = state.info.lock().map_err(|e| e.to_string())?;
    *info = None;

    let _ = app.emit("server-stopped", ());
    tracing::info!("Server stopped and frontend notified");
    Ok(())
}

/// Send a broadcast message to all connected WebSocket clients.
#[tauri::command]
pub async fn send_message(state: State<'_, ServerState>, message: String) -> Result<(), String> {
    let handle = state.server.lock().map_err(|e| e.to_string())?;
    match &*handle {
        Some(server) => {
            tracing::debug!(len = message.len(), "Broadcasting message to clients");
            let _ = server.send(&message);
            Ok(())
        }
        None => {
            tracing::warn!("send_message called but no server is running");
            Err("Server is not running".to_string())
        }
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
