import { useState } from 'react';
import { Outlet, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout, reset } from '../features/auth/authSlice';
import {
    LayoutDashboard,
    Users,
    FileCheck,
    ClipboardList,
    CalendarClock,
    Briefcase,
    LogOut,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

const Layout = () => {
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

    const isActive = (path) => location.pathname === path;

    const NavItem = ({ to, icon: Icon, label, exact = false }) => {
        const active = exact ? location.pathname === to : location.pathname.startsWith(to);

        return (
            <Link
                to={to}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative
                    ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                    ${isCollapsed ? 'justify-center' : ''}
                `}
                title={isCollapsed ? label : ''}
            >
                <Icon size={20} className={`flex-shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />

                {!isCollapsed && (
                    <span className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                        {label}
                    </span>
                )}

                {/* Tooltip for collapsed mode */}
                {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                        {label}
                    </div>
                )}
            </Link>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
            {/* Sidebar */}
            <aside
                className={`bg-slate-900 text-white flex-shrink-0 hidden md:flex flex-col transition-all duration-300 ease-in-out relative z-20 shadow-xl
                    ${isCollapsed ? 'w-20' : 'w-64'}
                `}
            >
                {/* Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-10 bg-blue-600 text-white p-1 rounded-full shadow-lg hover:bg-blue-500 transition-colors z-30 border-2 border-slate-900"
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                {/* Logo Section */}
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
                    {['ADMIN', 'BUSINESS_HEAD', 'HR'].includes(user?.role) ? (
                        <>
                            <NavItem to="/admin-dashboard" icon={LayoutDashboard} label="Dashboard" exact />

                            {/* Only Admin can manage employees fully */}
                            {user?.role === 'ADMIN' && (
                                <NavItem to="/admin/employees" icon={Users} label="Manage Employees" />
                            )}

                            {/* Admin does NOT see Approvals */}
                            {user?.role !== 'ADMIN' && (
                                <NavItem to="/admin/approvals" icon={FileCheck} label="Approvals" />
                            )}

                            <NavItem to="/admin/worklogs" icon={ClipboardList} label="Work Logs" />
                            <NavItem to="/admin/attendance" icon={CalendarClock} label="Attendance" />
                        </>
                    ) : (
                        <>
                            <NavItem to="/dashboard" icon={LayoutDashboard} label="Overview" exact />
                            <NavItem to="/dashboard/worklogs" icon={ClipboardList} label="My Logs" />
                            <NavItem to="/dashboard/requests" icon={CalendarClock} label="My Requests" />
                        </>
                    )}
                </nav>

                {/* User Profile */}
                <div className="p-4 border-t border-slate-800">
                    <div className={`flex items-center gap-3 mb-4 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'px-2'}`}>
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md flex-shrink-0">
                            {user?.name.charAt(0)}
                        </div>
                        {!isCollapsed && (
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium truncate text-white">{user?.name}</p>
                                <p className="text-xs text-slate-400 capitalize truncate">
                                    {['ADMIN', 'BUSINESS_HEAD', 'HR'].includes(user?.role)
                                        ? user?.role.replace('_', ' ').toLowerCase()
                                        : user?.designation}
                                </p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onLogout}
                        className={`w-full flex items-center gap-2 bg-slate-800 hover:bg-red-600/90 text-slate-300 hover:text-white py-2.5 rounded-lg transition-all duration-200 group
                            ${isCollapsed ? 'justify-center px-0' : 'px-4'}
                        `}
                        title="Sign Out"
                    >
                        <LogOut size={18} className="group-hover:scale-110 transition-transform" />
                        {!isCollapsed && <span className="text-sm font-medium">Sign Out</span>}
                    </button>
                </div>
            </aside>

            {/* Mobile Header & Main Content */}
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <header className="bg-white shadow-sm border-b border-slate-200 md:hidden p-4 flex justify-between items-center sticky top-0 z-10">
                    <img src="/orbix-logo.png" alt="Cookscape" className="h-8" />
                    <button onClick={onLogout} className="text-sm text-red-600 font-medium flex items-center gap-1">
                        <LogOut size={16} /> Logout
                    </button>
                </header>

                <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
