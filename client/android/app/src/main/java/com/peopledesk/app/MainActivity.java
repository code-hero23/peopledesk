package com.peopledesk.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        this.registerPlugin(CallLogPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
