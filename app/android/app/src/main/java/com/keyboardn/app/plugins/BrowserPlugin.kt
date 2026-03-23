package com.keyboardn.app.plugins

import android.content.Intent
import android.net.Uri
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "Browser")
class BrowserPlugin : Plugin() {
    @PluginMethod
    fun openUrl(call: PluginCall) {
        val url = call.getString("url") ?: run {
            call.reject("url is required")
            return
        }
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        activity.startActivity(intent)
        call.resolve()
    }
}
