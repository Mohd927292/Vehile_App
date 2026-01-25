package com.rna.vehicle_details_v2

import android.os.Build
import android.os.Bundle
import android.util.Log
import android.window.OnBackInvokedCallback
import android.window.OnBackInvokedDispatcher
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "Vechile_App"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    // Android 16 (API 35+) Predictive Back Gesture fix
    if (Build.VERSION.SDK_INT >= 35) {
      Log.d("MainActivity", "🔧 Android 16 Predictive Back handler registered")
      onBackInvokedDispatcher.registerOnBackInvokedCallback(
        OnBackInvokedDispatcher.PRIORITY_DEFAULT
      ) {
        Log.d("MainActivity", "🔙 Android 16 back gesture - forwarding to React Navigation")
        // Forward to React Navigation's back handler
        runOnUiThread {
          super.onBackPressed()
        }
      }
    }
  }
}