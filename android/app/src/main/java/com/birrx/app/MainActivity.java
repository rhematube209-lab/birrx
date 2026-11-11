package com.birrx.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

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
    }
}
