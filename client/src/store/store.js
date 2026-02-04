import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import employeeReducer from '../features/employee/employeeSlice';
import adminReducer from '../features/admin/adminSlice';
import projectReducer from '../features/projects/projectSlice';
import analyticsReducer from '../features/analytics/analyticsSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        employee: employeeReducer,
        admin: adminReducer,
        projects: projectReducer,
        analytics: analyticsReducer,
    },
});
