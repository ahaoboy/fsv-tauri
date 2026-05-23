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

#[derive(Clone, Serialize)]
struct FileInfo {
    name: String,
    path: String,
    file_type: String,
    size: u64,
    is_directory: bool,
    modified: Option<u64>, // Unix timestamp in seconds
}

#[tauri::command]
async fn get_available_directories(app: tauri::AppHandle) -> Result<Vec<DirectoryInfo>, String> {
    use std::fs;

    let path_resolver = app.path();
    let mut directories = Vec::new();

    // Helper function to validate directory: exists, accessible, and not empty
    fn is_valid_directory(path: &std::path::Path) -> bool {
        if !path.exists() || !path.is_dir() {
            return false;
        }

        if fs::metadata(path).is_err() {
            return false;
        }

        // Check if directory is not empty and accessible
        match fs::read_dir(path) {
            Ok(mut entries) => entries.next().is_some(),
            Err(_) => false,
        }
    }

    // Helper function to add directory if valid and not duplicate
    // Returns true if directory was added successfully
    fn try_add_directory(
        directories: &mut Vec<DirectoryInfo>,
        path: std::path::PathBuf,
        name: &str,
        icon: &str,
    ) -> bool {
        // Check if this category name already exists
        if directories.iter().any(|d| d.name == name) {
            return false;
        }

        if is_valid_directory(&path) {
            directories.push(DirectoryInfo {
                name: name.to_string(),
                path: path.to_string_lossy().to_string(),
                icon: icon.to_string(),
            });
            true
        } else {
            false
        }
    }

    // Home directory
    if let Ok(home_path) = path_resolver.home_dir() {
        let _ = try_add_directory(&mut directories, home_path, "Home", "🏠");
    }

    // Android-specific directories
    #[cfg(target_os = "android")]
    {
        use std::path::PathBuf;
        
        // Priority order: try environment variables first, then common paths
        
        // Internal Storage - try multiple sources
        let internal_storage_paths = vec![
            std::env::var("EXTERNAL_STORAGE").ok().map(PathBuf::from),
            Some(PathBuf::from("/storage/emulated/0")),
            Some(PathBuf::from("/sdcard")),
        ];
        
        for path_opt in internal_storage_paths {
            if let Some(path) = path_opt {
                if try_add_directory(&mut directories, path.clone(), "Internal Storage", "💾") {
                    // Found valid internal storage, now try subdirectories
                    try_add_directory(&mut directories, path.join("Download"), "Downloads", "�");
                    try_add_directory(&mut directories, path.join("DCIM"), "Camera", "�");
                    try_add_directory(&mut directories, path.join("Pictures"), "Pictures", "�️");
                    try_add_directory(&mut directories, path.join("Documents"), "Documents", "📄");
                    try_add_directory(&mut directories, path.join("Music"), "Music", "🎵");
                    try_add_directory(&mut directories, path.join("Movies"), "Videos", "🎬");
                    try_add_directory(&mut directories, path.join("Podcasts"), "Podcasts", "🎙️");
                    try_add_directory(&mut directories, path.join("Audiobooks"), "Audiobooks", "📚");
                    break; // Stop after finding first valid internal storage
                }
            }
        }
        
        // SD Card - try multiple sources
        let sd_card_paths = vec![
            std::env::var("SECONDARY_STORAGE").ok().map(PathBuf::from),
            Some(PathBuf::from("/mnt/sdcard")),
        ];
        
        for path_opt in sd_card_paths {
            if let Some(path) = path_opt {
                if try_add_directory(&mut directories, path, "SD Card", "�") {
                    break; // Stop after finding first valid SD card
                }
            }
        }
        
        // App-specific directories (always accessible without permissions)
        if let Ok(app_dir) = path_resolver.app_data_dir() {
            try_add_directory(&mut directories, app_dir, "App Data", "�");
        }
        
        if let Ok(cache_dir) = path_resolver.app_cache_dir() {
            try_add_directory(&mut directories, cache_dir, "App Cache", "🗂️");
        }
    }

    // Downloads directory
    if let Ok(downloads_path) = path_resolver.download_dir() {
        let _ = try_add_directory(&mut directories, downloads_path, "Downloads", "📥");
    }

    // Documents directory
    if let Ok(documents_path) = path_resolver.document_dir() {
        let _ = try_add_directory(&mut directories, documents_path, "Documents", "📄");
    }

    // Pictures directory
    if let Ok(pictures_path) = path_resolver.picture_dir() {
        let _ = try_add_directory(&mut directories, pictures_path, "Pictures", "🖼️");
    }

    // Videos directory
    if let Ok(videos_path) = path_resolver.video_dir() {
        let _ = try_add_directory(&mut directories, videos_path, "Videos", "🎬");
    }

    // Music directory
    if let Ok(music_path) = path_resolver.audio_dir() {
        let _ = try_add_directory(&mut directories, music_path, "Music", "🎵");
    }

    // Desktop directory
    #[cfg(not(target_os = "android"))]
    if let Ok(desktop_path) = path_resolver.desktop_dir() {
        let _ = try_add_directory(&mut directories, desktop_path, "Desktop", "🖥️");
    }

    // Temporary directory
    if let Ok(temp_path) = path_resolver.temp_dir() {
        let _ = try_add_directory(&mut directories, temp_path, "Temporary Files", "🗑️");
    }

    // Current directory (working directory)
    if let Ok(current_dir) = std::env::current_dir() {
        let _ = try_add_directory(&mut directories, current_dir, "Current Folder", "📁");
    }

    // Remove duplicates based on path
    directories.sort_by(|a, b| a.path.cmp(&b.path));
    directories.dedup_by(|a, b| a.path == b.path);
    
    // Sort by name for consistent ordering
    directories.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(directories)
}

#[tauri::command]
async fn get_server_status(state: State<'_, ServerState>) -> Result<Option<ServerInfo>, String> {
    let info = state.info.lock().map_err(|e| e.to_string())?;
    Ok(info.clone())
}

#[tauri::command]
async fn list_directory_files(directory_path: String) -> Result<Vec<FileInfo>, String> {
    use std::fs;
    use std::path::Path;
    use std::time::UNIX_EPOCH;

    let path = Path::new(&directory_path);
    
    // Check if path exists and is a directory
    if !path.exists() {
        return Err(format!("Path does not exist: {}", directory_path));
    }
    
    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", directory_path));
    }

    // Read directory entries
    let entries = fs::read_dir(path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut files = Vec::new();

    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(e) => {
                eprintln!("Error reading entry: {}", e);
                continue;
            }
        };

        let entry_path = entry.path();
        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(e) => {
                eprintln!("Error reading metadata for {:?}: {}", entry_path, e);
                continue;
            }
        };

        let name = entry
            .file_name()
            .to_string_lossy()
            .to_string();

        let is_directory = metadata.is_dir();
        let size = if is_directory { 0 } else { metadata.len() };

        // Get file extension to determine type
        let file_type = if is_directory {
            "directory".to_string()
        } else {
            entry_path
                .extension()
                .and_then(|ext| ext.to_str())
                .map(|ext| ext.to_lowercase())
                .unwrap_or_else(|| "file".to_string())
        };

        // Get modification time
        let modified = metadata
            .modified()
            .ok()
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .map(|duration| duration.as_secs());

        files.push(FileInfo {
            name,
            path: entry_path.to_string_lossy().to_string(),
            file_type,
            size,
            is_directory,
            modified,
        });
    }

    // Sort: directories first, then by name
    files.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(files)
}

#[cfg(target_os = "android")]
fn check_all_files_permission(app: &tauri::AppHandle) -> Result<bool, String> {
    let window = app.get_webview_window("main")
        .ok_or_else(|| "Failed to get main window".to_string())?;
        
    let (tx, rx) = std::sync::mpsc::channel();

    let res = window.with_webview(move |webview| {
        webview.jni_handle().exec(move |env, context, _webview| {
            let res = env.call_method(
                context,
                "hasAllFilesPermission",
                "()Z",
                &[]
            )
            .map_err(|e| format!("JNI call failed: {:?}", e))
            .and_then(|val| {
                val.z()
                    .map_err(|e| format!("Failed to get boolean return: {:?}", e))
            });
            let _ = tx.send(res);
        });
    });

    if let Err(e) = res {
        return Err(format!("Webview error: {:?}", e));
    }

    rx.recv()
        .map_err(|e| format!("Channel receive failed: {:?}", e))?
}

#[cfg(target_os = "android")]
fn request_all_files_permission(app: &tauri::AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("main")
        .ok_or_else(|| "Failed to get main window".to_string())?;
        
    let (tx, rx) = std::sync::mpsc::channel();

    let res = window.with_webview(move |webview| {
        webview.jni_handle().exec(move |env, context, _webview| {
            let res = env.call_method(
                context,
                "requestAllFilesPermission",
                "()V",
                &[]
            )
            .map(|_| ())
            .map_err(|e| format!("JNI call failed: {:?}", e));
            let _ = tx.send(res);
        });
    });

    if let Err(e) = res {
        return Err(format!("Webview error: {:?}", e));
    }

    rx.recv()
        .map_err(|e| format!("Channel receive failed: {:?}", e))?
}

#[cfg(target_os = "android")]
#[tauri::command]
async fn request_storage_permission(app: tauri::AppHandle) -> Result<bool, String> {
    match check_all_files_permission(&app) {
        Ok(true) => Ok(true),
        _ => {
            let _ = request_all_files_permission(&app);
            Ok(false)
        }
    }
}

#[cfg(not(target_os = "android"))]
#[tauri::command]
async fn request_storage_permission(_app: tauri::AppHandle) -> Result<bool, String> {
    // On non-Android platforms, always return true (no permission needed)
    Ok(true)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
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
            list_directory_files,
            request_storage_permission,
        ]);

    #[cfg(target_os = "android")]
    {
        builder = builder.plugin(tauri_plugin_android_fs::init());
    }

    #[cfg(target_os = "windows")]
    {
        builder = builder
            // .plugin(tauri_plugin_media::init())
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}));
    }

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
