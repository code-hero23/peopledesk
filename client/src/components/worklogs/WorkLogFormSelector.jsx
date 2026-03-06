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

const WorkLogFormSelector = ({ designation, onSuccess }) => {
    // Map designations to specialized forms
    switch (designation?.toUpperCase()) {
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

        case 'OFFICE ADMIN':
            // If there's an OfficeAdminWorkLogForm, use it
            return <DynamicWorkLogForm onSuccess={onSuccess} />;

        default:
            // Fallback to generic form or dynamic form
            return <WorkLogForm onSuccess={onSuccess} />;
    }
};

export default WorkLogFormSelector;
