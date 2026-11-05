package io.github.lordfran28.runa

import android.Manifest
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime

/** A passage each day at the time chosen on the Keys page. */
object Daily {
    private const val CHANNEL = "daily"

    fun set(c: Context, hhmm: String) {
        Store.setReminder(c, hhmm)
        schedule(c)
    }

    private fun alarm(c: Context): PendingIntent =
        PendingIntent.getBroadcast(c, 1, Intent(c, DailyReceiver::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)

    fun schedule(c: Context) {
        val am = c.getSystemService(AlarmManager::class.java) ?: return
        val pi = alarm(c)
        am.cancel(pi)
        val r = Store.reminder(c)
        if (r.isEmpty()) return
        val hm = r.split(":")
        val h = hm.getOrNull(0)?.toIntOrNull() ?: 8
        val m = hm.getOrNull(1)?.toIntOrNull() ?: 0
        var t = LocalDate.now().atTime(h, m).atZone(ZoneId.systemDefault())
        if (!t.isAfter(ZonedDateTime.now())) t = t.plusDays(1)
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t.toInstant().toEpochMilli(), pi)
    }

    fun notify(c: Context) {
        val e = Store.entryFor(c, Store.today()) ?: return
        if (Build.VERSION.SDK_INT >= 33 &&
            c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        val nm = c.getSystemService(NotificationManager::class.java) ?: return
        nm.createNotificationChannel(NotificationChannel(CHANNEL, "Today's passage", NotificationManager.IMPORTANCE_DEFAULT))
        val open = PendingIntent.getActivity(c, 2,
            Intent(c, MainActivity::class.java).putExtra("open", "#e/" + e.optString("id"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val text = e.optString("text")
        val n = Notification.Builder(c, CHANNEL)
            .setSmallIcon(R.drawable.ic_note)
            .setContentTitle(e.optString("src").ifEmpty { "Runa" })
            .setContentText(text)
            .setStyle(Notification.BigTextStyle().bigText(text))
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        nm.notify(1, n)
    }
}

class DailyReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) {
        Daily.notify(c)
        RunaWidget.updateAll(c)
        Daily.schedule(c)
    }
}

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) {
        Daily.schedule(c)
        RunaWidget.updateAll(c)
    }
}
