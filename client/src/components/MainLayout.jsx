import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout, reset, getMe } from '../features/auth/authSlice';
import { Menu, RefreshCw, LogOut } from 'lucide-react';
import InspirationalPopup from './common/InspirationalPopup';
import InstallApp from './InstallApp';
import SupportButton from './common/SupportButton';
import NoticeBoard from './common/NoticeBoard';
import Sidebar from './Sidebar';
import HourlyAlarm from './common/HourlyAlarm';

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isDecoraAI = location.pathname === '/decora-ai';

    useEffect(() => {
        if (user) {
            dispatch(getMe());
        }
    }, [dispatch]);

    const onLogout = () => {
        dispatch(logout());
        dispatch(reset());
        navigate('/login');
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    return (
        <div className="h-screen overflow-hidden bg-theme-bg flex font-sans text-theme-text relative transition-colors duration-300">
            {/* Mobile Sidebar Overlay Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-[60] md:hidden animate-fade-in"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar Component */}
            <Sidebar
                isMobileOpen={isMobileMenuOpen}
                onMobileClose={() => setIsMobileMenuOpen(false)}
            />

            {/* Mobile Header & Main Content */}
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <header className="bg-theme-card shadow-sm border-b border-theme-border md:hidden p-4 flex justify-between items-center sticky top-0 z-[50] animate-fade-in-down">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -ml-2 text-theme-muted hover:bg-theme-bg rounded-lg active:scale-95 transition-transform"
                        >
                            <Menu size={24} />
                        </button>
                        <img src="/orbix-logo.png" alt="Cookscape" className="h-8" />
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRefresh}
                            className="bg-theme-bg p-2 rounded-full text-theme-muted active:bg-theme-card transition-colors"
                        >
                            <RefreshCw size={18} />
                        </button>
                        <button onClick={onLogout} className="text-sm text-red-600 font-medium flex items-center gap-1">
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </header>

                <main className={`flex-1 overflow-y-auto ${isDecoraAI ? 'p-0' : 'p-6 md:p-8'}`}>
                    {!['ADMIN', 'HR', 'BUSINESS_HEAD', 'AE_MANAGER'].includes(user?.role) && !isDecoraAI && <NoticeBoard />}
                    <Outlet />
                </main>
            </div>
            {/* Inspirational Popup */}
            <InspirationalPopup />
            <InstallApp />
            <SupportButton />
            <HourlyAlarm />
        </div>
    );
};

export default Layout;
