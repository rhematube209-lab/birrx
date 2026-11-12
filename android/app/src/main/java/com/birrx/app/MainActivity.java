package com.birrx.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import androidx.activity.OnBackPressedCallback;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
    }
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SmsScannerPlugin.class);
        super.onCreate(savedInstanceState);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            private boolean pending = false;
            @Override
            public void handleOnBackPressed() {
                if (pending) return;
                pending = true;
                getBridge().getWebView().evaluateJavascript(
                    "Boolean(window.birrxHandleBack && window.birrxHandleBack())",
                    result -> {
                        pending = false;
                        if (isFinishing() || isDestroyed() || "true".equals(result)) return;
                        if (getBridge().getWebView().canGoBack()) {
                            getBridge().getWebView().goBack();
                        } else {
                            setEnabled(false);
                            try { getOnBackPressedDispatcher().onBackPressed(); }
                            finally { setEnabled(true); }
                        }
                    }
                );
            }
        });
    }
}
