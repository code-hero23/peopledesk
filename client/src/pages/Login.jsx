import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login, googleLogin, reset } from '../features/auth/authSlice';
import { GoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'framer-motion';

function Login() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const { email, password } = formData;

    const navigate = useNavigate();
    const dispatch = useDispatch();

    const { user, isLoading, isError, isSuccess, message, blockedUser } = useSelector(
        (state) => state.auth
    );

    useEffect(() => {
        if (isSuccess || user) {
            if (['ADMIN', 'BUSINESS_HEAD', 'HR'].includes(user.role)) {
                navigate('/admin-dashboard');
            } else {
                navigate('/dashboard');
            }
        }

        dispatch(reset());
    }, [user, isSuccess, navigate, dispatch]);

    // Error Display Logic
    const isBlockedError = isError && message && message.toLowerCase().includes('blocked');

    const onChange = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value,
        }));
    };

    const onSubmit = (e) => {
        e.preventDefault();
        dispatch(login({ email, password }));
    };

    const handleWhatsAppClick = () => {
        const message = `Hello, I need assistance with PeopleDesk login.${email ? ` Employee Email: ${email}` : ''}`;
        window.open(`https://wa.me/919092705679?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="flex min-h-screen bg-[#0f1112] font-sans text-white overflow-hidden"
        >
            <AnimatePresence>
                {/* Left Side - Hero / Brand */}
                <motion.div
                    key="login-brand"
                    initial={{ x: -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="hidden lg:flex lg:w-1/2 bg-[#d00000] relative overflow-hidden flex-col justify-between p-16 text-white"
                >
                    <div className="relative z-10">
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.6 }}
                        >
                            <img
                                src="/orbix-logo.png"
                                alt="Cookscape Logo"
                                className="h-24 object-contain mb-12 bg-white p-3 text-black rounded-2xl shadow-xl"
                            />
                        </motion.div>

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.6, duration: 0.6 }}
                        >
                            <h1 className="text-6xl font-black leading-[1.1] mb-6 tracking-tight">
                                If You Love Your Work,<br />
                                <span className="text-white/40">Everyday is a Holiday!</span>
                            </h1>
                            <p className="text-white/80 text-xl max-w-md leading-relaxed font-medium">
                                Experience a seamless workflow with the all-new enterprise-grade Cookscape Portal.
                            </p>
                        </motion.div>
                    </div>

                    {/* Abstract pattern */}
                    <div className="absolute top-0 right-0 w-full h-full opacity-5 pointer-events-none">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full fill-current text-white">
                            <path d="M0 0 L100 0 L100 100 Z" />
                        </svg>
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        transition={{ delay: 1, duration: 1 }}
                        className="relative z-10 text-xs font-bold uppercase tracking-[0.2em]"
                    >
                        &copy; {new Date().getFullYear()} Orbix Design &bull; Excellence in Design
                    </motion.div>
                </motion.div>

                {/* Right Side - Login Form */}
                <motion.div
                    key="login-form"
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 bg-[#0f1112]"
                >
                    <div className="w-full max-w-md">
                        <div className="bg-[#191b1c] p-10 lg:p-12 rounded-[2rem] shadow-2xl border border-white/5">
                            <div className="text-center mb-10 lg:text-left">
                                {/* Mobile Logo */}
                                <img src="/orbix-logo.png" alt="Logo" className="h-16 mx-auto lg:hidden mb-8 bg-white rounded-xl p-3 shadow-xl" />

                                <h2 className="text-4xl font-extrabold text-white tracking-tight mb-2">Welcome</h2>
                                <p className="text-slate-500 font-medium tracking-tight">Please sign in to continue.</p>
                            </div>

                            <form onSubmit={onSubmit} className="space-y-6">
                                {isError && (
                                    <div className={`p-4 rounded-xl border ${isBlockedError ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-orange-500/10 border-orange-500/50 text-orange-400'} text-sm font-medium animate-shake`}>
                                        <p className="flex items-center gap-2">
                                            <span>⚠️</span> {message}
                                        </p>
                                        {isBlockedError && (
                                            <a
                                                href={`https://mail.google.com/mail/?view=cm&fs=1&to=es.cookscape@gmail.com&su=${encodeURIComponent(`Account Unblock Request - ${blockedUser || email}`)}&body=${encodeURIComponent(`Dear HR Team,

I am writing to formally request the unblocking of my PeopleDesk account.

Employee Name: ${blockedUser || 'Employee'}
Email: ${email}

I understand my account was flagged due to absence. I am ready to resolve this and resume my duties.

Regards,
${blockedUser || 'Employee'}
PeopleDesk User`)}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-3 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                                            >
                                                <span>📧</span> Open in Gmail
                                            </a>
                                        )}
                                    </div>
                                )}
                                <div className="space-y-4">
                                    <div className="group">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1 transition-colors group-focus-within:text-[#d00000]">Email Address</label>
                                        <input
                                            type="email"
                                            className="w-full px-6 py-4 rounded-xl border border-white/10 bg-white/[0.03] text-white focus:border-[#d00000] focus:ring-4 focus:ring-[#d00000]/10 outline-none transition-all duration-300 placeholder-slate-700 font-medium"
                                            id="email"
                                            name="email"
                                            value={email}
                                            placeholder="name@cookscape.com"
                                            onChange={onChange}
                                            required
                                        />
                                    </div>
                                    <div className="group">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1 transition-colors group-focus-within:text-[#d00000]">Password</label>
                                        <input
                                            type="password"
                                            className="w-full px-6 py-4 rounded-xl border border-white/10 bg-white/[0.03] text-white focus:border-[#d00000] focus:ring-4 focus:ring-[#d00000]/10 outline-none transition-all duration-300 placeholder-slate-700 font-medium"
                                            id="password"
                                            name="password"
                                            value={password}
                                            placeholder="Enter your password"
                                            onChange={onChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={isLoading}
                                    className={`w-full py-4.5 rounded-xl font-bold uppercase tracking-widest text-white shadow-xl transition-all duration-300 ${isLoading ? 'bg-red-400 cursor-not-allowed' : 'bg-[#d00000] hover:bg-[#ff0000] shadow-red-600/20'
                                        }`}
                                >
                                    {isLoading ? 'Signing In...' : 'Sign In'}
                                </motion.button>

                                <div className="relative flex py-4 items-center">
                                    <div className="flex-grow border-t border-white/5"></div>
                                    <span className="flex-shrink-0 mx-4 text-slate-600 text-xs font-bold uppercase tracking-wider">Or</span>
                                    <div className="flex-grow border-t border-white/5"></div>
                                </div>

                                <div className="flex justify-center">
                                    <GoogleLogin
                                        onSuccess={credentialResponse => {
                                            dispatch(googleLogin(credentialResponse.credential));
                                        }}
                                        onError={() => {
                                            console.log('Login Failed');
                                            alert('Google Sign-In failed');
                                        }}
                                        theme="filled_black"
                                        shape="pill"
                                        size="large"
                                    />
                                </div>
                            </form>
                        </div >
                    </div >
                </motion.div >
            </AnimatePresence>

            <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                onClick={handleWhatsAppClick}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#25D366] hover:bg-[#20bd5a] text-white px-5 py-3 rounded-full shadow-lg hover:shadow-green-500/30 transition-all duration-300 group cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <svg
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    fill="currentColor"
                    className="text-white w-6 h-6"
                >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span className="font-bold text-sm tracking-wide">Need Help? Contact HR</span>
            </motion.button>
        </motion.div>
    );
}

export default Login;
