import React from 'react';
import { useAELocationTracker } from '../hooks/useAELocationTracker';

const AELocationWatcher = () => {
    // Activates automatic periodic location tracking for AE users
    useAELocationTracker();
    return null;
};

export default AELocationWatcher;
