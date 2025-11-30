package com.blackboxai.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import android.util.Log;

@CapacitorPlugin(name = "WidgetData")
public class WidgetDataPlugin extends Plugin {

    @PluginMethod
    public void updateTodoData(PluginCall call) {
        String json = call.getString("json");
        if (json == null) {
            call.reject("Must provide json string");
            return;
        }

        Context context = getContext();

        // 1. Save Data Synchronously
        SharedPreferences prefs = context.getSharedPreferences("widget_prefs", Context.MODE_PRIVATE);
        prefs.edit().putString("todo_list", json).commit();

        // 2. Notify Widgets
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, TodoWidget.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);

        // This is the ONLY call you need to refresh a ListView widget
        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.widget_todo_list);

        call.resolve();
    }

    @PluginMethod
    public void updatePomodoroData(PluginCall call) {
        String json = call.getString("json");
        Log.d("WidgetDataPlugin", "Received Pomodoro Data: " + json);
        if (json == null) {
            call.reject("Must provide json string");
            return;
        }

        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences("widget_prefs", Context.MODE_PRIVATE);
        prefs.edit().putString("pomodoro_state", json).commit(); // Use commit() for sync write

        // Trigger widget update
        Intent intent = new Intent(context, PomodoroWidget.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        int[] ids = AppWidgetManager.getInstance(context).getAppWidgetIds(new ComponentName(context, PomodoroWidget.class));
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        context.sendBroadcast(intent);

        call.resolve();
    }
}
