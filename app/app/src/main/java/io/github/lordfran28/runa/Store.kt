package io.github.lordfran28.runa

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate

/** What the app keeps on the phone: the coming days' passages (handed over by the page) and the daily time. */
object Store {
    private fun prefs(c: Context) = c.getSharedPreferences("runa", Context.MODE_PRIVATE)

    fun today(): Long = LocalDate.now().toEpochDay()

    fun saveSchedule(c: Context, json: String) { prefs(c).edit().putString("schedule", json).apply() }

    fun reminder(c: Context): String = prefs(c).getString("reminder", "") ?: ""

    fun setReminder(c: Context, hhmm: String) { prefs(c).edit().putString("reminder", hhmm).apply() }

    /** The passage for a day. Past the last day the page handed over, the same passages come round again. */
    fun entryFor(c: Context, day: Long): JSONObject? {
        val days: JSONArray = try {
            JSONObject(prefs(c).getString("schedule", "") ?: "").getJSONArray("days")
        } catch (e: Exception) { return null }
        if (days.length() == 0) return null
        for (i in 0 until days.length()) {
            val d = days.getJSONObject(i)
            if (d.optLong("d") == day) return d
        }
        val first = days.getJSONObject(0).optLong("d")
        val n = days.length().toLong()
        return days.getJSONObject((((day - first) % n + n) % n).toInt())
    }
}
