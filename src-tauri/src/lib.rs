use fsv::Config;
use serde::Serialize;
use std::{net::IpAddr, sync::Mutex};
use tauri::State;

/// Holds the running server's handle so it stays alive and can be stopped.
struct ServerState {
    handle: Mutex<Option<fsv::ServerHandle>>,
    info: Mutex<Option<ServerInfo>>,
}

#[derive(Clone, Serialize)]
struct ServerInfo {
    ip: Vec<IpAddr>,
    port: u16,
}

#[tauri::command]
async fn start_server(
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

    let (ip, actual_port, join_handle) = fsv::run(Config {
        port,
        path: path.into(),
    })
    .await
    .map_err(|e| format!("Failed to start server: {}", e))?;

    let info = ServerInfo {
        ip,
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

#[tauri::command]
async fn stop_server(state: State<'_, ServerState>) -> Result<(), String> {
    let mut handle = state.handle.lock().map_err(|e| e.to_string())?;
    if let Some(mut h) = handle.take() {
        let _ = h.shutdown();
    }
    let mut info = state.info.lock().map_err(|e| e.to_string())?;
    *info = None;
    Ok(())
}

#[tauri::command]
async fn get_server_status(state: State<'_, ServerState>) -> Result<Option<ServerInfo>, String> {
    let info = state.info.lock().map_err(|e| e.to_string())?;
    Ok(info.clone())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .manage(ServerState {
            handle: Mutex::new(None),
            info: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            start_server,
            stop_server,
            get_server_status,
        ]);

    #[cfg(target_os = "windows")]
    let builder = builder
        // .plugin(tauri_plugin_media::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}));

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
