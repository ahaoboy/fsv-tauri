// ---------------------------------------------------------------------------
// Module declarations
// ---------------------------------------------------------------------------

mod android;
mod directories;
mod server;

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

use serde::Serialize;
use std::net::IpAddr;

/// Information about a running server instance.
#[derive(Clone, Serialize)]
pub struct ServerInfo {
    pub ips: Vec<IpAddr>,
    pub port: u16,
}

// ---------------------------------------------------------------------------
// Re-export all Tauri commands so the handler macro can see them
// ---------------------------------------------------------------------------

use android::request_storage_permission;
use directories::{get_available_directories, list_directory_files};
use server::{get_server_status, send_message, start_server, stop_server, ServerState};

// ---------------------------------------------------------------------------
// Application entry point
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .manage(ServerState {
            server: std::sync::Mutex::new(None),
            info: std::sync::Mutex::new(None),
            shutting_down: std::sync::atomic::AtomicBool::new(false),
        })
        .invoke_handler(tauri::generate_handler![
            start_server,
            stop_server,
            get_server_status,
            send_message,
            get_available_directories,
            list_directory_files,
            request_storage_permission,
        ]);

    #[cfg(target_os = "windows")]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}));

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
