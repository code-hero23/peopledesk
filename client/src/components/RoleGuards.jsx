import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Redirects Admins away from Employee routes
export const EmployeeGuard = () => {
    const { user } = useSelector((state) => state.auth);

    if (user && ['ADMIN', 'BUSINESS_HEAD', 'HR', 'AE_MANAGER'].includes(user.role)) {
        return <Navigate to="/admin-dashboard" replace />;
    }

    return <Outlet />;
};

// Redirects Root URL based on Role
export const RootRedirect = () => {
    const { user } = useSelector((state) => state.auth);

    if (user && ['ADMIN', 'BUSINESS_HEAD', 'HR', 'AE_MANAGER'].includes(user.role)) {
        return <Navigate to="/admin-dashboard" replace />;
    }

    // Default to employee dashboard
    return <Navigate to="/dashboard" replace />;
};
