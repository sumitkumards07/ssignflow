package com.assignflow.app;

import android.content.Intent;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "UpdatePlugin")
public class UpdatePlugin extends Plugin {

    @PluginMethod
    public void startUpdate(PluginCall call) {
        String apkUrl = call.getString("apkUrl");
        if (apkUrl == null) {
            call.reject("Must provide apkUrl");
            return;
        }

        Intent intent = new Intent(getContext(), UpdateActivity.class);
        intent.putExtra("apkUrl", apkUrl);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }
}
