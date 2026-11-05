package io.github.lordfran28.runa

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import org.json.JSONObject

/** The website, full screen, with a few things only the app can do (see [Bridge]). */
class MainActivity : Activity() {
    companion object {
        const val SITE = "https://lordfran28.github.io/Runa/"
    }

    private lateinit var web: WebView
    @Volatile private var shared: String? = null
    private var pendingReminder: String? = null

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        web = WebView(this)
        setContentView(web)
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = false
        }
        web.addJavascriptInterface(Bridge(), "RunaApp")
        web.webChromeClient = WebChromeClient()
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, req: WebResourceRequest): Boolean {
                val u = req.url.toString()
                if (u.startsWith(SITE)) return false
                try { startActivity(Intent(Intent.ACTION_VIEW, req.url)) } catch (e: Exception) { }
                return true
            }
        }
        if (state != null) web.restoreState(state)
        handle(intent, first = state == null)
    }

    override fun onSaveInstanceState(out: Bundle) {
        super.onSaveInstanceState(out)
        web.saveState(out)
    }

    override fun onNewIntent(i: Intent) {
        super.onNewIntent(i)
        setIntent(i)
        handle(i, first = false)
    }

    private fun handle(i: Intent?, first: Boolean) {
        if (i?.action == Intent.ACTION_SEND && i.type?.startsWith("text/") == true) {
            val text = i.getStringExtra(Intent.EXTRA_TEXT) ?: ""
            val subject = i.getStringExtra(Intent.EXTRA_SUBJECT) ?: ""
            shared = JSONObject().put("text", text).put("subject", subject).toString()
            if (first) web.loadUrl(SITE)
            else web.evaluateJavascript("window.runaShared && window.runaShared(${JSONObject.quote(text)}, ${JSONObject.quote(subject)})", null)
            return
        }
        val open = i?.getStringExtra("open") ?: ""
        if (first || open.isNotEmpty()) web.loadUrl(SITE + open)
    }

    @Deprecated("Back goes back a page in the book before it leaves the app")
    override fun onBackPressed() {
        if (web.canGoBack()) web.goBack() else super.onBackPressed()
    }

    override fun onRequestPermissionsResult(code: Int, perms: Array<out String>, results: IntArray) {
        super.onRequestPermissionsResult(code, perms, results)
        val r = pendingReminder ?: return
        pendingReminder = null
        Daily.set(this, r)
        web.evaluateJavascript("location.hash === '#keys' && window.dispatchEvent(new HashChangeEvent('hashchange'))", null)
    }

    private fun scan() {
        val opts = GmsBarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build()
        GmsBarcodeScanning.getClient(this, opts).startScan()
            .addOnSuccessListener { code ->
                val t = code.rawValue ?: ""
                web.evaluateJavascript("window.runaScanned && window.runaScanned(${JSONObject.quote(t)})", null)
            }
    }

    /** What the page can ask of the app. Called from the page's own script as window.RunaApp. */
    inner class Bridge {
        @JavascriptInterface
        fun setSchedule(json: String) {
            Store.saveSchedule(this@MainActivity, json)
            RunaWidget.updateAll(this@MainActivity)
        }

        @JavascriptInterface
        fun getReminder(): String = Store.reminder(this@MainActivity)

        @JavascriptInterface
        fun setReminder(hhmm: String) {
            runOnUiThread {
                if (hhmm.isNotEmpty() && Build.VERSION.SDK_INT >= 33 &&
                    checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    Store.setReminder(this@MainActivity, hhmm)
                    pendingReminder = hhmm
                    requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
                } else {
                    Daily.set(this@MainActivity, hhmm)
                }
            }
        }

        @JavascriptInterface
        fun takeShared(): String {
            val s = shared ?: ""
            shared = null
            return s
        }

        @JavascriptInterface
        fun scan() { runOnUiThread { this@MainActivity.scan() } }

        @JavascriptInterface
        fun version(): String = try {
            packageManager.getPackageInfo(packageName, 0).versionName ?: ""
        } catch (e: Exception) { "" }
    }
}
