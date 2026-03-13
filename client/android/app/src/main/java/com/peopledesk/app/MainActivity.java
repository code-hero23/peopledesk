package com.peopledesk.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.capacitorjs.plugins.preferences.PreferencesPlugin;
import io.ionic.backgroundrunner.plugin.BackgroundRunnerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CallLogPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
