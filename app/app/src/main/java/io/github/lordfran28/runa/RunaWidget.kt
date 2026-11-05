package io.github.lordfran28.runa

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

/** Today's passage on the home screen. Tapping it opens the passage in the app. */
class RunaWidget : AppWidgetProvider() {
    override fun onUpdate(c: Context, mgr: AppWidgetManager, ids: IntArray) {
        ids.forEach { update(c, mgr, it) }
    }

    companion object {
        fun updateAll(c: Context) {
            val mgr = AppWidgetManager.getInstance(c)
            mgr.getAppWidgetIds(ComponentName(c, RunaWidget::class.java)).forEach { update(c, mgr, it) }
        }

        fun update(c: Context, mgr: AppWidgetManager, id: Int) {
            val v = RemoteViews(c.packageName, R.layout.widget)
            val e = Store.entryFor(c, Store.today())
            v.setTextViewText(R.id.w_text, e?.optString("text") ?: "Open Runa once and the day's passage will show here.")
            v.setTextViewText(R.id.w_src, e?.optString("src") ?: "")
            val open = Intent(c, MainActivity::class.java)
                .putExtra("open", if (e != null) "#e/" + e.optString("id") else "")
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            v.setOnClickPendingIntent(R.id.w_root, PendingIntent.getActivity(c, 3, open,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            mgr.updateAppWidget(id, v)
        }
    }
}
