package com.karcha.app;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Enables chrome://inspect debugging — remove before production release
        WebView.setWebContentsDebuggingEnabled(true);
    }
}
