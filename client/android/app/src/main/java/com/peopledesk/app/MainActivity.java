package com.peopledesk.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.capacitorjs.plugins.backgroundrunner.BackgroundRunnerPlugin;
import com.capacitorjs.plugins.preferences.PreferencesPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CallLogPlugin.class);
        registerPlugin(BackgroundRunnerPlugin.class);
        registerPlugin(PreferencesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
