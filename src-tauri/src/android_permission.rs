/// Android-specific storage permission helpers.
///
/// On Android 11+ (API 30+), `MANAGE_EXTERNAL_STORAGE` requires the user to
/// grant "All files access" via a system settings intent. These functions
/// bridge the gap via JNI calls to the Android activity.

/// Check whether the "All files access" permission is already granted.
#[cfg(target_os = "android")]
pub fn check_all_files_permission(app: &tauri::AppHandle) -> Result<bool, String> {
    use tauri::Manager;

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Failed to get main window".to_string())?;

    let (tx, rx) = std::sync::mpsc::channel();

    window.with_webview(move |webview| {
        webview.jni_handle().exec(move |env, context, _webview| {
            let res = env
                .call_method(context, "hasAllFilesPermission", "()Z", &[])
                .map_err(|e| format!("JNI call failed: {:?}", e))
                .and_then(|val| val.z().map_err(|e| format!("Failed to get boolean: {:?}", e)));
            let _ = tx.send(res);
        });
    })?;

    rx.recv()
        .map_err(|e| format!("Channel receive failed: {:?}", e))?
}

/// Launch the system settings intent to request "All files access".
#[cfg(target_os = "android")]
pub fn request_all_files_permission(app: &tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Failed to get main window".to_string())?;

    let (tx, rx) = std::sync::mpsc::channel();

    window.with_webview(move |webview| {
        webview.jni_handle().exec(move |env, context, _webview| {
            let res = env
                .call_method(context, "requestAllFilesPermission", "()V", &[])
                .map(|_| ())
                .map_err(|e| format!("JNI call failed: {:?}", e));
            let _ = tx.send(res);
        });
    })?;

    rx.recv()
        .map_err(|e| format!("Channel receive failed: {:?}", e))?
}

/// Tauri command: check the storage permission, and request it if not granted.
#[cfg(target_os = "android")]
#[tauri::command]
pub async fn request_storage_permission(app: tauri::AppHandle) -> Result<bool, String> {
    match check_all_files_permission(&app) {
        Ok(true) => Ok(true),
        _ => {
            let _ = request_all_files_permission(&app);
            Ok(false)
        }
    }
}

/// Stub for non-Android platforms — always returns `true`.
#[cfg(not(target_os = "android"))]
#[tauri::command]
pub async fn request_storage_permission(_app: tauri::AppHandle) -> Result<bool, String> {
    Ok(true)
}
