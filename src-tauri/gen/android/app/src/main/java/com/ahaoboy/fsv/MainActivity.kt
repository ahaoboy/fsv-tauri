package com.ahaoboy.fsv

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.Settings
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import app.tauri.annotation.Command
import app.tauri.plugin.Invoke

class MainActivity : TauriActivity() {
    private var localNetworkPermissionRequested = false

    private val requestLocalNetworkPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (!granted) {
                Toast.makeText(
                    this,
                    "Local network access is required to serve files on the LAN",
                    Toast.LENGTH_LONG
                ).show()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
    }

    override fun onResume() {
        super.onResume()
        // Ask only after storage access is settled: on a fresh install the
        // storage flow opens system settings, which would otherwise
        // interrupt the local-network permission dialog.
        requestLocalNetworkAccessIfNeeded()
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

    // -- Local network permission (Android 17+ / API 37+) -------------------

    /**
     * Android 17 blocks LAN traffic for apps targeting SDK 37+ unless
     * ACCESS_LOCAL_NETWORK is granted. Without it the built-in file server
     * cannot accept connections from other devices (and WebView requests to
     * a LAN address are blocked as well).
     */
    private fun requestLocalNetworkAccessIfNeeded() {
        if (Build.VERSION.SDK_INT >= 37 &&
            hasAllFilesPermission() &&
            !localNetworkPermissionRequested &&
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_LOCAL_NETWORK
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            localNetworkPermissionRequested = true
            requestLocalNetworkPermission.launch(Manifest.permission.ACCESS_LOCAL_NETWORK)
        }
    }
}
