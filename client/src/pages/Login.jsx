import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login, googleLogin, reset } from '../features/auth/authSlice';
import { GoogleLogin } from '@react-oauth/google';

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
        <div className="flex min-h-screen bg-[#191b1c] font-sans text-white">
            {/* Left Side - Hero / Brand */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#e00000] relative overflow-hidden flex-col justify-between p-12 text-white">
                <div className="relative z-10">
                    <img
                        src="/orbix-logo.png"
                        alt="Cookscape Logo"
                        className="h-32 object-contain mb-8 bg-white p-2 text-black rounded-lg shadow-sm"
                    />
                    <h1 className="text-5xl font-bold leading-tight mb-4">If You Love Your Work,<br /> <span className="text-gray-400">Everyday is a Holiday!</span> </h1>
                    <p className="text-red-100 text-xl max-w-md">Streamline your workflow, manage projects, and track progress with the all-new Cookscape Portal.</p>
                </div>

                {/* Abstract pattern */}
                <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full fill-current text-white">
                        <path d="M0 0 L100 0 L100 100 Z" />
                    </svg>
                </div>

                <div className="relative z-10 text-sm text-red-200">
                    &copy; {new Date().getFullYear()} Orbix Design. All rights reserved.
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#191b1c]">
                <div className="w-full max-w-md bg-[#191b1c] p-10 rounded-2xl shadow-2xl border border-gray-800">
                    <div className="text-center mb-8 lg:text-left">
                        {/* Mobile Logo */}
                        <img src="/orbix-logo.png" alt="Logo" className="h-20 mx-auto lg:hidden mb-6 bg-white rounded-lg p-2" />

                        <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
                        <p className="text-gray-400 mt-2">Please enter your credentials to access your workspace.</p>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Email Address</label>
                            <input
                                type="email"
                                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-[#25282a] text-white focus:border-[#e00000] focus:ring-4 focus:ring-red-500/10 outline-none transition-all placeholder-gray-500"
                                id="email"
                                name="email"
                                value={email}
                                placeholder="name@cookscape.com"
                                onChange={onChange}
                                required
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-semibold text-gray-300">Password</label>
                            </div>
                            <input
                                type="password"
                                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-[#25282a] text-white focus:border-[#e00000] focus:ring-4 focus:ring-red-500/10 outline-none transition-all placeholder-gray-500"
                                id="password"
                                name="password"
                                value={password}
                                placeholder="Enter your password"
                                onChange={onChange}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-3.5 rounded-lg font-bold text-white shadow-lg shadow-red-500/30 transition-all transform active:scale-[0.98] ${isLoading ? 'bg-red-400 cursor-not-allowed' : 'bg-[#e00000] hover:bg-[#b30000]'
                                }`}
                        >
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>

                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-gray-700"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-500 text-sm">Or sign in with</span>
                            <div className="flex-grow border-t border-gray-700"></div>
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
        </div>
    );
}

export default Login;
