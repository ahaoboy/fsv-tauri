package com.ahaoboy.fsv

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.Settings
import androidx.activity.enableEdgeToEdge
import app.tauri.annotation.Command
import app.tauri.plugin.Invoke

class MainActivity : TauriActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
    }

    // -- "All files access" permission (Android 11+ / API 30+) --------------

    /** Check whether the app has full external storage access. */
    fun hasAllFilesPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Environment.isExternalStorageManager()
        } else {
            true
        }
    }

    /** Open system settings so the user can grant "All files access". */
    fun requestAllFilesPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            try {
                val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
                    .apply { data = Uri.parse("package:${packageName}") }
                startActivity(intent)
            } catch (e: Exception) {
                val intent = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
                startActivity(intent)
            }
        }
    }

    // -- Tauri @Command bridge (called from frontend via invoke()) -----------

    @Command
    fun hasAllFilesPermission(invoke: Invoke): Boolean {
        return hasAllFilesPermission()
    }

    @Command
    fun requestAllFilesPermission(invoke: Invoke) {
        requestAllFilesPermission()
        invoke.resolve()
    }
}
