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

    const { user, isLoading, isError, isSuccess, message } = useSelector(
        (state) => state.auth
    );

    useEffect(() => {
        if (isError) {
            alert(message);
        }

        if (isSuccess || user) {
            if (['ADMIN', 'BUSINESS_HEAD', 'HR'].includes(user.role)) {
                navigate('/admin-dashboard');
            } else {
                navigate('/dashboard');
            }
        }

        dispatch(reset());
    }, [user, isError, isSuccess, message, navigate, dispatch]);

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
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
}

export default Login;
