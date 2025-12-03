package com.assignflow.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import org.json.JSONObject;

public class PomodoroWidget extends AppWidgetProvider {

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("widget_prefs", Context.MODE_PRIVATE);
        String json = prefs.getString("pomodoro_state", "{}");
        
        String time = "25:00";
        boolean isRunning = false;
        int progress = 100;
        long targetTime = 0;

        try {
            JSONObject state = new JSONObject(json);
            time = state.optString("time", "25:00");
            isRunning = state.optBoolean("isRunning", false);
            progress = state.optInt("progress", 100);
            targetTime = state.optLong("targetTime", 0);
        } catch (Exception e) {
            e.printStackTrace();
        }

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_pomodoro);
        
        if (isRunning && targetTime > 0) {
            views.setViewVisibility(R.id.timer_text, android.view.View.GONE);
            views.setViewVisibility(R.id.timer_chronometer, android.view.View.VISIBLE);
            
            // Chronometer uses SystemClock.elapsedRealtime() (time since boot)
            // We need to convert our wall-clock targetTime to elapsedRealtime
            long elapsedOffset = android.os.SystemClock.elapsedRealtime() - System.currentTimeMillis();
            views.setChronometer(R.id.timer_chronometer, targetTime + elapsedOffset, null, true);
            views.setChronometerCountDown(R.id.timer_chronometer, true);
        } else {
            views.setViewVisibility(R.id.timer_text, android.view.View.VISIBLE);
            views.setViewVisibility(R.id.timer_chronometer, android.view.View.GONE);
            views.setTextViewText(R.id.timer_text, time);
        }

        views.setProgressBar(R.id.timer_progress, 100, progress, false);

        if (isRunning) {
            views.setImageViewResource(R.id.action_button, android.R.drawable.ic_media_pause);
        } else {
            views.setImageViewResource(R.id.action_button, android.R.drawable.ic_media_play);
        }

        // Open app on click with deep link
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setData(android.net.Uri.parse("assignflow://pomodoro"));
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.action_button, pendingIntent);
        views.setOnClickPendingIntent(R.id.timer_text, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(intent.getAction())) {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName thisWidget = new ComponentName(context, PomodoroWidget.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
            onUpdate(context, appWidgetManager, appWidgetIds);
        }
    }
}
