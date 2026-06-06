package com.karcha.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int SMS_PERMISSION_REQUEST_CODE = 101;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // WebView debugging enabled (debug builds only — CI uses assembleDebug)
        WebView.setWebContentsDebuggingEnabled(true);
        // Request SMS permissions at startup (triggers Android permission dialog)
        requestSmsPermissionsIfNeeded();
    }

    private void requestSmsPermissionsIfNeeded() {
        String[] smsPerms = {
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.READ_SMS
        };
        boolean needRequest = false;
        for (String perm : smsPerms) {
            if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
                needRequest = true;
                break;
            }
        }
        if (needRequest) {
            ActivityCompat.requestPermissions(this, smsPerms, SMS_PERMISSION_REQUEST_CODE);
        }
    }
}
