package com.assignflow.app;

import android.os.Bundle;
import android.view.View;
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
        
        // Performance optimizations for instant rendering
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        registerPlugin(WidgetDataPlugin.class);
        // registerPlugin(UpdatePlugin.class);
    }
}

