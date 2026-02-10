import { useState, useRef, useEffect } from 'react';
import { Camera, X, CheckCircle, RefreshCcw } from 'lucide-react';

const CheckInPhotoModal = ({ isOpen, onClose, onSubmit, isLoading, isCheckingOut }) => {
    const [photo, setPhoto] = useState(null);
    const [preview, setPreview] = useState(null);
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);
    const [facingMode, setFacingMode] = useState('user'); // 'user' or 'environment'
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const [location, setLocation] = useState({ lat: null, lng: null, areaName: 'Fetching location...' });

    // Start Camera & Get Location
    const startCamera = async () => {
        // Stop any existing stream first
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        // Get Location & Reverse Geocode
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;

                    setLocation(prev => ({
                        ...prev,
                        lat: lat.toFixed(4),
                        lng: lng.toFixed(4),
                        areaName: 'Detecting Area...'
                    }));

                    try {
                        // Reverse geocoding using OpenStreetMap Nominatim with higher zoom (18)
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                            { headers: { 'User-Agent': 'PeopleDesk-App/1.0' } }
                        );
                        const data = await response.json();
                        const addr = data.address;

                        // Prioritize more granular address components to avoid 20km generalization
                        const primaryArea = addr.road || addr.village || addr.suburb || addr.neighbourhood || addr.hamlet || addr.residential || addr.city_district || addr.town || 'Local Area';
                        const secondaryArea = addr.city || addr.town || addr.state_district || addr.county || '';

                        const formattedArea = secondaryArea && primaryArea !== secondaryArea
                            ? `${primaryArea}, ${secondaryArea}`
                            : primaryArea;

                        setLocation({
                            lat: lat.toFixed(4),
                            lng: lng.toFixed(4),
                            areaName: formattedArea
                        });
                    } catch (err) {
                        console.error("Reverse geocoding failed:", err);
                        setLocation({
                            lat: lat.toFixed(4),
                            lng: lng.toFixed(4),
                            areaName: 'Location Name Unavailable'
                        });
                    }
                },
                (err) => {
                    console.warn("Location access denied or unavailable:", err);
                    setLocation({ lat: null, lng: null, areaName: 'Location Access Denied' });
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        }

        try {
            setError(null);
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Camera Error:", err);
            setError("Unable to access camera. Please check permissions.");
        }
    };

    // Toggle Camera (Front/Back)
    const toggleCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    // Restart camera whenever facingMode changes or Modal is opened
    useEffect(() => {
        if (isOpen) {
            // Reset state for new session
            if (!stream) {
                setPhoto(null);
                setPreview(null);
                setError(null);
            }
            if (!photo) {
                startCamera();
            }
        } else {
            stopCamera();
        }
    }, [facingMode, isOpen, photo]);

    // Stop Camera
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    // Capture Photo
    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const context = canvas.getContext('2d');

            // Mirror if using front camera
            if (facingMode === 'user') {
                context.translate(canvas.width, 0);
                context.scale(-1, 1);
            }

            // Draw video frame
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Reset transform for text overlay
            context.setTransform(1, 0, 0, 1, 0, 0);

            // Add Timestamp & Location Overlay
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            // Construct the strings
            const areaStr = location.areaName || 'Detecting Area...';
            const coordStr = location.lat ? `${location.lat}, ${location.lng}` : '';

            // Overlay Bar Design (Premium)
            const barHeight = 160;
            const fontSizeLarge = 40;
            const fontSizeSmall = 28;

            context.fillStyle = 'rgba(0, 0, 0, 0.75)';
            context.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

            // Bottom Accent Line
            context.fillStyle = '#3b82f6'; // Blue-500
            context.fillRect(0, canvas.height - 4, canvas.width, 4);

            // Text Properties
            context.fillStyle = '#ffffff';
            context.textBaseline = 'top';

            // 1. Draw Date/Time (Top Left of Bar)
            context.font = `bold ${fontSizeLarge}px sans-serif`;
            context.fillText(`${dateStr} | ${timeStr}`, 24, canvas.height - barHeight + 25);

            // 2. Draw Area Name (Bottom Left of Bar) - NOW BOLD
            context.font = `bold ${fontSizeSmall}px sans-serif`;
            context.fillStyle = '#ffffff'; // Changed to white for better legibility when bolded
            context.fillText(`📍 ${areaStr}`, 24, canvas.height - barHeight + 85);

            // 3. Draw Coordinates (Align Right)
            if (coordStr) {
                context.font = `bold ${fontSizeSmall - 4}px monospace`;
                context.fillStyle = '#60a5fa'; // blue-400
                const coordWidth = context.measureText(coordStr).width;
                context.fillText(coordStr, canvas.width - coordWidth - 24, canvas.height - barHeight + 85);
            }

            // Convert to blob/file
            canvas.toBlob((blob) => {
                const file = new File([blob], "checkin-photo.jpg", { type: "image/jpeg" });
                setPhoto(file);

                // Create preview URL
                setPreview(canvas.toDataURL('image/jpeg'));

                // Stop stream after capture
                stopCamera();
            }, 'image/jpeg', 0.8);
        }
    };

    // Cleanup
    useEffect(() => {
        return () => stopCamera();
    }, []);

    const handleRetake = () => {
        setPhoto(null);
        setPreview(null);
        // Camera will auto-start due to useEffect dependency on !photo
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col relative">
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
                    <h3 className="font-bold text-white text-sm bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm flex items-center gap-2">
                        {isCheckingOut ? 'Check-Out' : 'Check-In'}
                    </h3>
                    <button onClick={onClose} className="p-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Main Camera Area */}
                <div className="relative w-full aspect-[3/4] bg-black flex items-center justify-center">
                    {error ? (
                        <div className="text-center text-white p-4">
                            <p className="mb-4">{error}</p>
                            <button onClick={startCamera} className="bg-white text-black px-4 py-2 rounded-full font-bold">Retry</button>
                        </div>
                    ) : (
                        <>
                            {!preview ? (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                                />
                            ) : (
                                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                            )}
                            <canvas ref={canvasRef} className="hidden" />

                            {/* Switch Camera Button (Only visible when camera is active) */}
                            {!photo && !error && (
                                <button
                                    onClick={toggleCamera}
                                    className="absolute bottom-4 right-4 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm transition-colors border border-white/20"
                                >
                                    <RefreshCcw size={20} />
                                </button>
                            )}
                        </>
                    )}
                </div>

                {/* Controls Area */}
                <div className="p-6 bg-white flex flex-col items-center">
                    {!photo ? (
                        <div className="w-full flex flex-col items-center gap-2">
                            <button
                                onClick={capturePhoto}
                                className="w-20 h-20 rounded-full border-4 border-blue-500 p-1 flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
                            >
                                <div className="w-full h-full bg-blue-500 rounded-full"></div>
                            </button>
                            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mt-2">Tap to Capture</p>
                        </div>
                    ) : (
                        <div className="w-full space-y-3">
                            <button
                                onClick={() => onSubmit(photo)}
                                disabled={isLoading}
                                className="w-full py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                {isLoading ? (
                                    <span>Uploading...</span>
                                ) : (
                                    <>
                                        <CheckCircle size={20} />
                                        <span>Confirm & Submit</span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleRetake}
                                className="w-full py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95"
                            >
                                Retake
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CheckInPhotoModal;
