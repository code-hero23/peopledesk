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
            return <DynamicWorkLogForm onSuccess={onSuccess} role="ACCOUNT" />;
        case 'CLIENT CARE':
            return <DynamicWorkLogForm onSuccess={onSuccess} role="CLIENT-CARE" />;
        case 'DIGITAL MARKETING':
            return <DynamicWorkLogForm onSuccess={onSuccess} role="DIGITAL-MARKETING" />;
        case 'OFFICE ADMIN':
        case 'ADMIN':
            return <DynamicWorkLogForm onSuccess={onSuccess} role="OFFICE-ADMINISTRATION" />;
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
