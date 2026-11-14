package com.birrx.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import androidx.activity.OnBackPressedCallback;

public class MainActivity extends BridgeActivity {
    private long firstBackAt = 0;
    private android.widget.Toast backToast;
    private void exitOnDoubleBack() {
        long now=android.os.SystemClock.elapsedRealtime();
        if(firstBackAt!=0 && now-firstBackAt<2000){if(backToast!=null)backToast.cancel();finish();return;}
        firstBackAt=now;
        backToast=android.widget.Toast.makeText(this,"Press Back again to close BirrX",android.widget.Toast.LENGTH_SHORT);backToast.show();
    }
    @Override public void onPause(){firstBackAt=0;super.onPause();}

    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
    }
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SmsScannerPlugin.class);
        registerPlugin(DeviceLockPlugin.class);
        super.onCreate(savedInstanceState);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            private boolean pending = false;
            @Override
            public void handleOnBackPressed() {
                if(DeviceLockPlugin.isLocked()){exitOnDoubleBack();return;}
                if (pending) return;
                pending = true;
                getBridge().getWebView().evaluateJavascript(
                    "Boolean(window.birrxHandleBack && window.birrxHandleBack())",
                    result -> {
                        pending = false;
                        if (isFinishing() || isDestroyed())return;
                        if("true".equals(result)){firstBackAt=0;return;}
                        exitOnDoubleBack();
                    }
                );
            }
        });
    }
}
