import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import employeeReducer from '../features/employee/employeeSlice';
import adminReducer from '../features/admin/adminSlice';
import projectReducer from '../features/projects/projectSlice';
import analyticsReducer from '../features/analytics/analyticsSlice';
import voucherReducer from '../features/voucher/voucherSlice';
import carpenterReducer from '../features/carpenter/carpenterSlice';
import themeReducer from '../features/theme/themeSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        employee: employeeReducer,
        admin: adminReducer,
        projects: projectReducer,
        analytics: analyticsReducer,
        voucher: voucherReducer,
        carpenter: carpenterReducer,
        theme: themeReducer,
    },
});
