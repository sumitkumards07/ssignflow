package com.blackboxai.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

public class TodoWidget extends AppWidgetProvider {

    public static final String ACTION_TOGGLE_TASK = "com.blackboxai.app.ACTION_TOGGLE_TASK";
    public static final String EXTRA_ITEM_INDEX = "com.blackboxai.app.EXTRA_ITEM_INDEX";

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_todo);

        // 1. Bind the RemoteViewsService (The List Adapter)
        Intent intent = new Intent(context, TodoWidgetService.class);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        intent.setData(Uri.parse(intent.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.widget_todo_list, intent);

        // 2. Set Empty View
        views.setEmptyView(R.id.widget_todo_list, R.id.empty_view);

        // 3. Set PendingIntent Template for List Items (Click Listener)
        Intent toggleIntent = new Intent(context, TodoWidget.class);
        toggleIntent.setAction(ACTION_TOGGLE_TASK);
        toggleIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        // MUTABLE is required to allow the intent to be modified with the extra index
        PendingIntent togglePendingIntent = PendingIntent.getBroadcast(
            context, 
            appWidgetId, 
            toggleIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
        );
        views.setPendingIntentTemplate(R.id.widget_todo_list, togglePendingIntent);

        // 4. Header Click (Open App)
        Intent appIntent = new Intent(context, MainActivity.class);
        PendingIntent appPendingIntent = PendingIntent.getActivity(
            context, 
            0, 
            appIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.header, appPendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
        super.onUpdate(context, appWidgetManager, appWidgetIds);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        
        // HANDLE THE CLICK / SYNC
        if (ACTION_TOGGLE_TASK.equals(intent.getAction())) {
            int viewIndex = intent.getIntExtra(EXTRA_ITEM_INDEX, -1);
            
            if (viewIndex != -1) {
                SharedPreferences prefs = context.getSharedPreferences("widget_prefs", Context.MODE_PRIVATE);
                String jsonString = prefs.getString("todo_list", "[]");
                
                try {
                    JSONArray array = new JSONArray(jsonString);
                    if (viewIndex < array.length()) {
                        JSONObject item = array.getJSONObject(viewIndex);
                        
                        // Toggle logic
                        boolean currentStatus = item.optBoolean("completed", false);
                        item.put("completed", !currentStatus);
                        
                        // SAVE DATA BACK TO PREFS (This was missing)
                        prefs.edit().putString("todo_list", array.toString()).commit(); // Commit is sync, apply is async
                        
                        // NOTIFY WIDGET TO REFRESH
                        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
                        int appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
                        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.widget_todo_list);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        } else if (AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(intent.getAction())) {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName thisWidget = new ComponentName(context, TodoWidget.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.widget_todo_list);
        }
    }
}
