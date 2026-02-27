import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout, reset } from '../features/auth/authSlice';
import {
    LayoutDashboard,
    Users,
    FileCheck,
    ClipboardList,
    CalendarClock,
    Camera,
    MapPin,
    BarChart3,
    Megaphone,
    LogOut,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    DollarSign,
    Home,
    X
} from 'lucide-react';

const Sidebar = ({ isMobileOpen, onMobileClose }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const location = useLocation();
    const { user } = useSelector((state) => state.auth);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const onLogout = () => {
        dispatch(logout());
        dispatch(reset());
        navigate('/login');
    };

    const handleRefresh = () => window.location.reload();

    // ─── Nav Item ────────────────────────────────────────────────────────────
    const NavItem = ({ to, icon: Icon, label, exact = false }) => {
        const active = exact
            ? location.pathname === to
            : location.pathname === to || location.pathname.startsWith(to + '/');

        return (
            <Link
                to={to}
                onClick={onMobileClose}
                title={isCollapsed ? label : ''}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative
                    ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                    ${isCollapsed ? 'justify-center' : ''}
                `}
            >
                <Icon
                    size={20}
                    className={`flex-shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}
                />

                {!isCollapsed && (
                    <span className="font-medium whitespace-nowrap overflow-hidden opacity-100 transition-all duration-300">
                        {label}
                    </span>
                )}

                {/* Tooltip in collapsed mode */}
                {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                        {label}
                    </div>
                )}
            </Link>
        );
    };

    const isAdmin = ['ADMIN', 'BUSINESS_HEAD', 'HR', 'AE_MANAGER'].includes(user?.role);

    return (
        <aside
            className={`bg-slate-900 text-white flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out shadow-xl
                fixed md:relative z-40 h-full
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                ${isCollapsed ? 'w-20' : 'w-64'}
            `}
        >
            {/* Desktop collapse toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:flex absolute -right-3 top-10 bg-blue-600 text-white p-1 rounded-full shadow-lg hover:bg-blue-500 transition-colors z-30 border-2 border-slate-900"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Mobile close button */}
            <button
                onClick={onMobileClose}
                className="md:hidden absolute top-4 right-4 text-slate-400 hover:text-white"
            >
                <X size={24} />
            </button>

            {/* Logo */}
            <div className={`p-4 border-b border-slate-800 flex items-center justify-center transition-all duration-300 ${isCollapsed ? 'h-20' : 'h-32'} overflow-hidden`}>
                <img
                    src="/orbix-logo.png"
                    alt="Cookscape"
                    className={`object-contain rounded-md p-2 transition-all duration-300 ${isCollapsed ? 'h-10 w-10' : 'h-auto w-4/5 max-h-24'}`}
                    style={{ backgroundColor: '#191919' }}
                />
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-2 mt-2 overflow-y-auto scrollbar-hide">
                {isAdmin ? (
                    <>
                        <NavItem to="/admin-dashboard" icon={LayoutDashboard} label="Dashboard" exact />

                        {['ADMIN', 'HR', 'BUSINESS_HEAD', 'AE_MANAGER'].includes(user?.role) && (
                            <NavItem to="/admin/approvals" icon={FileCheck} label="Approvals" />
                        )}

                        <NavItem to="/admin/worklogs" icon={ClipboardList} label="Work Reports" />
                        <NavItem to="/admin/attendance" icon={CalendarClock} label="Attendance" />

                        {['ADMIN', 'HR', 'BUSINESS_HEAD', 'AE_MANAGER'].includes(user?.role) && (
                            <NavItem to="/admin/visit-requests" icon={MapPin} label="Visit Requests" />
                        )}

                        {['ADMIN', 'HR', 'BUSINESS_HEAD'].includes(user?.role) && (
                            <NavItem to="/admin/wfh" icon={Home} label="WFH Approvals" />
                        )}

                        <NavItem to="/admin/attendance-verification" icon={Camera} label="Verification" />
                        <NavItem to="/admin/analytics" icon={BarChart3} label="Analytics" />

                        {['ADMIN', 'AE_MANAGER'].includes(user?.role) && (
                            <NavItem to="/admin/employees" icon={Users} label="Manage Employees" />
                        )}

                        {user?.role === 'ADMIN' && (
                            <NavItem to="/admin/salary-settings" icon={DollarSign} label="Salary Settings" />
                        )}

                        {user?.role === 'ADMIN' && (
                            <NavItem to="/admin/popup-management" icon={Camera} label="Popup Config" />
                        )}

                        {['ADMIN', 'HR'].includes(user?.role) && (
                            <NavItem to="/admin/announcements" icon={Megaphone} label="Announcements" />
                        )}
                    </>
                ) : (
                    <>
                        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" exact />
                        <NavItem to="/dashboard/worklogs" icon={ClipboardList} label="My Reports" />
                        <NavItem to="/dashboard/requests" icon={CalendarClock} label="My Requests" />
                        <NavItem to="/dashboard/salary" icon={DollarSign} label="My Salary" />
                        {user?.wfhViewEnabled && (
                            <NavItem to="/dashboard/wfh" icon={Home} label="Apply WFH" />
                        )}
                    </>
                )}
            </nav>

            {/* User Profile + Actions */}
            <div className="p-4 border-t border-slate-800">
                <div className={`flex items-center gap-3 mb-4 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'px-2'}`}>
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md flex-shrink-0">
                        {user?.name?.charAt(0) || '?'}
                    </div>
                    {!isCollapsed && (
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate text-white">{user?.name}</p>
                            <p className="text-xs text-slate-400 capitalize truncate">
                                {isAdmin
                                    ? user?.role.replace(/_/g, ' ').toLowerCase()
                                    : user?.designation}
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 mb-2">
                    <button
                        onClick={handleRefresh}
                        title="Refresh App"
                        className="flex-1 flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white py-2.5 rounded-lg transition-all duration-200 group justify-center"
                    >
                        <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                    </button>
                </div>

                <button
                    onClick={onLogout}
                    title="Sign Out"
                    className={`w-full flex items-center gap-2 bg-slate-800 hover:bg-red-600/90 text-slate-300 hover:text-white py-2.5 rounded-lg transition-all duration-200 group
                        ${isCollapsed ? 'justify-center px-0' : 'px-4'}
                    `}
                >
                    <LogOut size={18} className="group-hover:scale-110 transition-transform" />
                    {!isCollapsed && <span className="text-sm font-medium">Sign Out</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
