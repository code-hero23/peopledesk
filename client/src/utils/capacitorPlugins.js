import { registerPlugin } from '@capacitor/core';

// This utility ensures that plugins are only registered once across the application.
// Capacitor errors if registerPlugin is called multiple times for the same plugin name.

let CallLogPluginInstance = null;

export const getCallLogPlugin = () => {
    if (!CallLogPluginInstance) {
        try {
            CallLogPluginInstance = registerPlugin('CallLog');
        } catch (error) {
            // If it's already registered, we might get an error in some environments (though usually it just warns)
            // But Capacitor specifically says "already registered" and throws.
            console.warn("CallLog plugin already registered or failed to register:", error);
        }
    }
    return CallLogPluginInstance;
};
