package com.assignflow.app;

import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Enable third-party cookies and mixed content
        WebView webView = getBridge().getWebView();
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        webView.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        registerPlugin(WidgetDataPlugin.class);
        // registerPlugin(UpdatePlugin.class);
    }
}
