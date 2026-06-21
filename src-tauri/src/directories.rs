use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::Manager;

/// Information about an available directory shown in the UI selector.
#[derive(Clone, Serialize)]
pub struct DirectoryInfo {
    pub name: String,
    pub path: String,
}

/// Metadata for a file or directory entry.
#[derive(Clone, Serialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub file_type: String,
    pub size: u64,
    pub is_directory: bool,
    /// Unix timestamp in seconds
    pub modified: Option<u64>,
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// Returns `true` if `path` is an existing, accessible, non-empty directory.
fn is_valid_directory(path: &Path) -> bool {
    if !path.exists() || !path.is_dir() {
        return false;
    }
    if std::fs::metadata(path).is_err() {
        return false;
    }
    match std::fs::read_dir(path) {
        Ok(mut entries) => entries.next().is_some(),
        Err(_) => false,
    }
}

/// Try to add a directory entry if it's valid and its name isn't already present.
/// Returns `true` when the entry was added.
fn try_add_directory(directories: &mut Vec<DirectoryInfo>, path: PathBuf, name: &str) -> bool {
    if directories.iter().any(|d| d.name == name) {
        return false;
    }
    if is_valid_directory(&path) {
        directories.push(DirectoryInfo {
            name: name.to_string(),
            path: path.to_string_lossy().to_string(),
        });
        true
    } else {
        false
    }
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

/// Return a list of available directories that the user can serve.
#[tauri::command]
pub async fn get_available_directories(
    app: tauri::AppHandle,
) -> Result<Vec<DirectoryInfo>, String> {
    tracing::debug!("get_available_directories called");

    let path_resolver = app.path();
    let mut directories = Vec::new();

    // -- Common directories --
    if let Ok(home_path) = path_resolver.home_dir() {
        let _ = try_add_directory(&mut directories, home_path, "Home");
    }

    // Android-specific directories
    #[cfg(target_os = "android")]
    {
        // Internal Storage — try env var first, then common paths
        let internal_storage_paths: Vec<Option<PathBuf>> = vec![
            std::env::var("EXTERNAL_STORAGE").ok().map(PathBuf::from),
            Some(PathBuf::from("/storage/emulated/0")),
            Some(PathBuf::from("/sdcard")),
        ];

        for path_opt in internal_storage_paths {
            if let Some(ref path) = path_opt {
                if try_add_directory(&mut directories, path.clone(), "Internal Storage") {
                    try_add_directory(&mut directories, path.join("Download"), "Downloads");
                    try_add_directory(&mut directories, path.join("DCIM"), "Camera");
                    try_add_directory(&mut directories, path.join("Pictures"), "Pictures");
                    try_add_directory(&mut directories, path.join("Documents"), "Documents");
                    try_add_directory(&mut directories, path.join("Music"), "Music");
                    try_add_directory(&mut directories, path.join("Movies"), "Videos");
                    try_add_directory(&mut directories, path.join("Podcasts"), "Podcasts");
                    try_add_directory(&mut directories, path.join("Audiobooks"), "Audiobooks");
                    break;
                }
            }
        }

        // SD Card
        let sd_card_paths: Vec<Option<PathBuf>> = vec![
            std::env::var("SECONDARY_STORAGE").ok().map(PathBuf::from),
            Some(PathBuf::from("/mnt/sdcard")),
        ];
        for path_opt in sd_card_paths {
            if let Some(path) = path_opt {
                if try_add_directory(&mut directories, path, "SD Card") {
                    break;
                }
            }
        }

        // App-private directories (always accessible without permissions)
        if let Ok(app_dir) = path_resolver.app_data_dir() {
            try_add_directory(&mut directories, app_dir, "App Data");
        }
        if let Ok(cache_dir) = path_resolver.app_cache_dir() {
            try_add_directory(&mut directories, cache_dir, "App Cache");
        }
    }

    // Standard user directories
    if let Ok(downloads_path) = path_resolver.download_dir() {
        let _ = try_add_directory(&mut directories, downloads_path, "Downloads");
    }
    if let Ok(documents_path) = path_resolver.document_dir() {
        let _ = try_add_directory(&mut directories, documents_path, "Documents");
    }
    if let Ok(pictures_path) = path_resolver.picture_dir() {
        let _ = try_add_directory(&mut directories, pictures_path, "Pictures");
    }
    if let Ok(videos_path) = path_resolver.video_dir() {
        let _ = try_add_directory(&mut directories, videos_path, "Videos");
    }
    if let Ok(music_path) = path_resolver.audio_dir() {
        let _ = try_add_directory(&mut directories, music_path, "Music");
    }

    // Desktop (non-Android only)
    #[cfg(not(target_os = "android"))]
    if let Ok(desktop_path) = path_resolver.desktop_dir() {
        let _ = try_add_directory(&mut directories, desktop_path, "Desktop");
    }

    // Deduplicate by path and sort by name
    directories.sort_by(|a, b| a.path.cmp(&b.path));
    directories.dedup_by(|a, b| a.path == b.path);
    directories.sort_by(|a, b| a.name.cmp(&b.name));

    tracing::debug!(
        count = directories.len(),
        "get_available_directories complete"
    );
    Ok(directories)
}

/// List files and subdirectories inside a given directory.
#[tauri::command]
pub async fn list_directory_files(directory_path: String) -> Result<Vec<FileInfo>, String> {
    use std::fs;
    use std::time::UNIX_EPOCH;

    let path = Path::new(&directory_path);

    if !path.exists() {
        return Err(format!("Path does not exist: {}", directory_path));
    }
    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", directory_path));
    }

    let entries = fs::read_dir(path).map_err(|e| format!("Failed to read directory: {}", e))?;

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

        let name = entry.file_name().to_string_lossy().to_string();
        let is_directory = metadata.is_dir();
        let size = if is_directory { 0 } else { metadata.len() };

        let file_type = if is_directory {
            "directory".to_string()
        } else {
            entry_path
                .extension()
                .and_then(|ext| ext.to_str())
                .map(|ext| ext.to_lowercase())
                .unwrap_or_else(|| "file".to_string())
        };

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

    // Directories first, then sort by name (case-insensitive)
    files.sort_by(|a, b| match (a.is_directory, b.is_directory) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(files)
}
