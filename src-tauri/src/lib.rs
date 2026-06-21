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
use server::{ServerState, get_server_status, send_message, start_server, stop_server};

// ---------------------------------------------------------------------------
// Application entry point
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize tracing subscriber controlled by RUST_LOG env var.
    // Defaults to `info` if not set. Use e.g. RUST_LOG=debug for verbose output.
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .with_target(false)
        .init();

    // Bridge log crate events (from Tauri internals & dependencies) into tracing.
    tracing_log::LogTracer::init().ok();

    tracing::info!("FSV Tauri application starting");

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
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
