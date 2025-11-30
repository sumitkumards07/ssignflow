package com.blackboxai.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
import android.os.Bundle;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class TodoWidgetService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new TodoWidgetFactory(this.getApplicationContext());
    }
}

class TodoWidgetFactory implements RemoteViewsService.RemoteViewsFactory {
    private Context context;
    private List<JSONObject> todoList = new ArrayList<>();

    public TodoWidgetFactory(Context context) {
        this.context = context;
    }

    @Override
    public void onCreate() {
        // We load data in onDataSetChanged, but it's good practice to init here too
        onDataSetChanged();
    }

    @Override
    public void onDataSetChanged() {
        long identityToken = android.os.Binder.clearCallingIdentity();
        try {
            SharedPreferences prefs = context.getSharedPreferences("widget_prefs", Context.MODE_PRIVATE);
            String json = prefs.getString("todo_list", "[]");
            android.util.Log.d("TodoWidgetService", "onDataSetChanged called. JSON: " + json);
            
            todoList.clear();
            try {
                JSONArray array = new JSONArray(json);
                for (int i = 0; i < array.length(); i++) {
                    todoList.add(array.getJSONObject(i));
                }
                android.util.Log.d("TodoWidgetService", "Parsed " + todoList.size() + " items");
            } catch (JSONException e) {
                e.printStackTrace();
                android.util.Log.e("TodoWidgetService", "Error parsing JSON", e);
            }
        } finally {
            android.os.Binder.restoreCallingIdentity(identityToken);
        }
    }

    @Override
    public void onDestroy() {
        todoList.clear();
    }

    @Override
    public int getCount() {
        return todoList.size();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        if (position == android.widget.AdapterView.INVALID_POSITION || todoList.isEmpty() || position >= todoList.size()) {
            return null;
        }

        // Ensure this layout matches your XML file name
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_todo_item);

        try {
            JSONObject todo = todoList.get(position);
            String text = todo.optString("text", "Task");
            boolean completed = todo.optBoolean("completed", false);

            views.setTextViewText(R.id.todo_text, text);

            // FIX: Avoid complex reflection like setColorFilter on CheckBoxes.
            // Instead, simply change text color or an ImageView resource.
            if (completed) {
                // Strike-through logic or Gray color
                views.setTextColor(R.id.todo_text, 0xFF888888); 
                // Ideally, swap a checkbox image:
                views.setImageViewResource(R.id.todo_checkbox, R.drawable.ic_checkbox_checked);
            } else {
                views.setTextColor(R.id.todo_text, 0xFFFFFFFF);
                views.setImageViewResource(R.id.todo_checkbox, R.drawable.ic_checkbox_unchecked);
            }

            // Fill-in Intent for Click Handling
            Bundle extras = new Bundle();
            extras.putInt(TodoWidget.EXTRA_ITEM_INDEX, position);
            Intent fillInIntent = new Intent();
            fillInIntent.putExtras(extras);
            
            // Apply click listener to the whole row container
            // Ensure your widget_todo_item.xml has an ID called widget_item_container
            views.setOnClickFillInIntent(R.id.widget_item_container, fillInIntent);

        } catch (Exception e) {
            e.printStackTrace();
        }

        return views;
    }

    @Override
    public RemoteViews getLoadingView() {
        return null;
    }

    @Override
    public int getViewTypeCount() {
        return 1;
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public boolean hasStableIds() {
        return true;
    }
}
