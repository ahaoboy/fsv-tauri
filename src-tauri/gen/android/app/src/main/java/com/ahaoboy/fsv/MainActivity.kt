package com.ahaoboy.fsv

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import android.os.Build
import android.os.Environment
import android.content.Intent
import android.net.Uri
import android.provider.Settings

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  fun hasAllFilesPermission(): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      Environment.isExternalStorageManager()
    } else {
      true
    }
  }

  fun requestAllFilesPermission() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      try {
        val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
          data = Uri.parse("package:${packageName}")
        }
        startActivity(intent)
      } catch (e: Exception) {
        val intent = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
        startActivity(intent)
      }
    }
  }
}
