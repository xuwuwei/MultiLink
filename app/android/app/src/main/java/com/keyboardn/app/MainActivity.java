package com.keyboardn.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.keyboardn.app.plugins.TcpSocketPlugin;
import com.keyboardn.app.plugins.ZeroConfPlugin;
import com.keyboardn.app.plugins.PurchasesPlugin;
import com.keyboardn.app.plugins.BrowserPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TcpSocketPlugin.class);
        registerPlugin(ZeroConfPlugin.class);
        registerPlugin(PurchasesPlugin.class);
        registerPlugin(BrowserPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
