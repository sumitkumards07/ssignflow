package com.assignflow.app;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import java.io.File;

public class UpdateActivity extends AppCompatActivity {

    private long downloadId = -1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Simple UI or just a loading spinner could be added here
        // For now, we'll just start the download process
        
        String apkUrl = getIntent().getStringExtra("apkUrl");
        if (apkUrl == null || apkUrl.isEmpty()) {
            Toast.makeText(this, "Invalid update URL", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        if (!getPackageManager().canRequestPackageInstalls()) {
            Toast.makeText(this, "Please allow 'Install unknown apps' to update", Toast.LENGTH_LONG).show();
            startActivityForResult(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
                    .setData(Uri.parse("package:" + getPackageName())), 1234);
        } else {
            downloadAndInstall(apkUrl);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 1234) {
            if (getPackageManager().canRequestPackageInstalls()) {
                String apkUrl = getIntent().getStringExtra("apkUrl");
                if (apkUrl != null) {
                    downloadAndInstall(apkUrl);
                }
            } else {
                Toast.makeText(this, "Permission denied. Cannot update.", Toast.LENGTH_SHORT).show();
                finish();
            }
        }
    }

    private void downloadAndInstall(String url) {
        Toast.makeText(this, "Downloading update...", Toast.LENGTH_SHORT).show();

        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url))
                .setTitle("Downloading Update")
                .setDescription("Please wait...")
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS, "update.apk");

        DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
        downloadId = dm.enqueue(request);

        registerReceiver(new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                if (id == downloadId) {
                    installApk(dm, downloadId);
                    unregisterReceiver(this);
                }
            }
        }, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
    }

    private void installApk(DownloadManager dm, long downloadId) {
        Uri uri = dm.getUriForDownloadedFile(downloadId);
        if (uri == null) return;

        Intent installIntent = new Intent(Intent.ACTION_VIEW);
        installIntent.setDataAndType(uri, "application/vnd.android.package-archive");
        installIntent.setFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(installIntent);
        finish();
    }
}
