use fsv::Config;
use serde::Serialize;
use std::{net::IpAddr, sync::Mutex};
use tauri::Manager;
use tauri::State;

/// Holds the running server's handle so it stays alive and can be stopped.
struct ServerState {
    handle: Mutex<Option<fsv::ServerHandle>>,
    info: Mutex<Option<ServerInfo>>,
}

#[derive(Clone, Serialize)]
struct ServerInfo {
    ips: Vec<IpAddr>,
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

    let (ips, actual_port, join_handle) = fsv::run(Config {
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
async fn send_message(state: State<'_, ServerState>, message: String) -> Result<(), String> {
    // Get the server handle
    let mut handle = state.handle.lock().map_err(|e| e.to_string())?;

    // Check if server is running
    if let Some(h) = handle.take() {
        // Send message through the server handle
        // Note: This is a placeholder - you'll need to implement actual message sending
        // based on your fsv library's capabilities
        println!("Message received: {}", message);
        let _ = h.send(&message);
        // Put the handle back
        *handle = Some(h);
        Ok(())
    } else {
        Err("Server is not running".to_string())
    }
}

#[derive(Clone, Serialize)]
struct DirectoryInfo {
    name: String,
    path: String,
    icon: String,
}

#[tauri::command]
async fn get_available_directories(app: tauri::AppHandle) -> Result<Vec<DirectoryInfo>, String> {
    use std::fs;

    let path_resolver = app.path();
    let mut directories = Vec::new();

    // Helper function to validate directory: exists, accessible, and not empty
    fn is_valid_directory(path: &std::path::Path) -> bool {
        // Check if path exists and is a directory
        if !path.exists() || !path.is_dir() {
            return false;
        }

        // Check if we can read metadata (accessibility check)
        if fs::metadata(path).is_err() {
            return false;
        }

        // Check if directory is not empty
        match fs::read_dir(path) {
            Ok(mut entries) => {
                // Directory is valid if it has at least one entry
                entries.next().is_some()
            }
            Err(_) => false, // Can't read directory, consider it invalid
        }
    }

    // Helper function to add directory if valid
    fn try_add_directory(
        directories: &mut Vec<DirectoryInfo>,
        path: std::path::PathBuf,
        name: &str,
        icon: &str,
    ) {
        if is_valid_directory(&path) {
            directories.push(DirectoryInfo {
                name: name.to_string(),
                path: path.to_string_lossy().to_string(),
                icon: icon.to_string(),
            });
        }
    }

    // Home directory
    if let Ok(home_path) = path_resolver.home_dir() {
        try_add_directory(&mut directories, home_path, "Home", "🏠");
    }

    // Downloads directory
    if let Ok(downloads_path) = path_resolver.download_dir() {
        try_add_directory(&mut directories, downloads_path, "Downloads", "📥");
    }

    // Documents directory
    if let Ok(documents_path) = path_resolver.document_dir() {
        try_add_directory(&mut directories, documents_path, "Documents", "📄");
    }

    // Pictures directory
    if let Ok(pictures_path) = path_resolver.picture_dir() {
        try_add_directory(&mut directories, pictures_path, "Pictures", "🖼️");
    }

    // Videos directory
    if let Ok(videos_path) = path_resolver.video_dir() {
        try_add_directory(&mut directories, videos_path, "Videos", "🎬");
    }

    // Music directory
    if let Ok(music_path) = path_resolver.audio_dir() {
        try_add_directory(&mut directories, music_path, "Music", "🎵");
    }

    // Desktop directory
    if let Ok(desktop_path) = path_resolver.desktop_dir() {
        try_add_directory(&mut directories, desktop_path, "Desktop", "🖥️");
    }

    // Temporary directory
    if let Ok(temp_path) = path_resolver.temp_dir() {
        try_add_directory(&mut directories, temp_path, "Temporary Files", "🗑️");
    }

    // Current directory (working directory)
    if let Ok(current_dir) = std::env::current_dir() {
        try_add_directory(&mut directories, current_dir, "Current Folder", "📁");
    }

    // Sort by name for consistent ordering
    directories.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(directories)
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
            send_message,
            get_available_directories,
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
