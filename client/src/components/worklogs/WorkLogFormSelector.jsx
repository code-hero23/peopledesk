import React from 'react';
import AEWorkLogForm from './AEWorkLogForm';
import CREWorkLogForm from './CREWorkLogForm';
import FAWorkLogForm from './FAWorkLogForm';
import LAWorkLogForm from './LAWorkLogForm';
import AccountWorkLogForm from './AccountWorkLogForm';
import DynamicWorkLogForm from './DynamicWorkLogForm';
import ClientCareWorkLogForm from './ClientCareWorkLogForm';
import DigitalMarketingWorkLogForm from './DigitalMarketingWorkLogForm';
import WorkLogForm from '../WorkLogForm';
import { WORK_LOG_CONFIG } from '../../config/workLogConfig';

const WorkLogFormSelector = ({ designation, onSuccess }) => {
    if (!designation) return <WorkLogForm onSuccess={onSuccess} />;

    const upperDesignation = designation.toUpperCase();

    // 1. Check for dedicated, hardcoded component forms
    switch (upperDesignation) {
        case 'AE':
        case 'AE MANAGER':
            return <AEWorkLogForm onSuccess={onSuccess} />;
        case 'CRE':
        case 'CRE MANAGER':
            return <CREWorkLogForm onSuccess={onSuccess} />;
        case 'FA':
        case 'FA MANAGER':
            return <FAWorkLogForm onSuccess={onSuccess} />;
        case 'LA':
        case 'LA MANAGER':
            return <LAWorkLogForm onSuccess={onSuccess} />;
        case 'ACCOUNT':
        case 'ACCOUNTANT':
            return <AccountWorkLogForm onSuccess={onSuccess} />;
        case 'CLIENT CARE':
            return <ClientCareWorkLogForm onSuccess={onSuccess} />;
        case 'DIGITAL MARKETING':
            return <DigitalMarketingWorkLogForm onSuccess={onSuccess} />;
    }

    // 2. Check if there's a dynamic config for this designation.
    // Replace spaces with hyphens to match the config keys.
    const normalizedRole = upperDesignation.replace(/\s+/g, '-');
    if (WORK_LOG_CONFIG[normalizedRole]) {
        return <DynamicWorkLogForm onSuccess={onSuccess} role={normalizedRole} />;
    }

    // 3. Fallback to generic form
    return <WorkLogForm onSuccess={onSuccess} />;
};

export default WorkLogFormSelector;
