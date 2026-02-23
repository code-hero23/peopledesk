import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout, reset, getMe } from '../features/auth/authSlice';
import { Menu, RefreshCw, LogOut } from 'lucide-react';
import InspirationalPopup from './common/InspirationalPopup';
import InstallApp from './InstallApp';
import SupportButton from './common/SupportButton';
import NoticeBoard from './common/NoticeBoard';
import Sidebar from './Sidebar';

const Layout = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        <div className="h-screen overflow-hidden bg-slate-50 flex font-sans text-slate-900 relative">
            {/* Mobile Sidebar Overlay Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden animate-fade-in"
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
                <header className="bg-white shadow-sm border-b border-slate-200 md:hidden p-4 flex justify-between items-center sticky top-0 z-10 animate-fade-in-down">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg active:scale-95 transition-transform"
                        >
                            <Menu size={24} />
                        </button>
                        <img src="/orbix-logo.png" alt="Cookscape" className="h-8" />
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRefresh}
                            className="bg-slate-100 p-2 rounded-full text-slate-600 active:bg-slate-200 transition-colors"
                        >
                            <RefreshCw size={18} />
                        </button>
                        <button onClick={onLogout} className="text-sm text-red-600 font-medium flex items-center gap-1">
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                    {!['ADMIN', 'HR', 'BUSINESS_HEAD', 'AE_MANAGER'].includes(user?.role) && <NoticeBoard />}
                    <Outlet />
                </main>
            </div>
            {/* Inspirational Popup */}
            <InspirationalPopup />
            <InstallApp />
            <SupportButton />
        </div>
    );
};

export default Layout;
