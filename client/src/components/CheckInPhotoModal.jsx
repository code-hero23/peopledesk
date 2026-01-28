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

    const [location, setLocation] = useState(null);

    // Start Camera & Get Location
    const startCamera = async () => {
        // Stop any existing stream first
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        // Get Location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude.toFixed(4),
                        lng: position.coords.longitude.toFixed(4)
                    });
                },
                (err) => console.warn("Location access denied or unavailable:", err),
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

    // Restart camera whenever facingMode changes
    useEffect(() => {
        if (isOpen && !photo) {
            startCamera();
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
            const dateStr = now.toLocaleDateString();
            const timeStr = now.toLocaleTimeString();
            const locStr = location ? `Lat: ${location.lat}, Lng: ${location.lng}` : 'Location: Not Available';

            // Overlay Bar
            const barHeight = 80; // Adjust based on resolution
            const fontSize = 24;

            context.fillStyle = 'rgba(0, 0, 0, 0.6)';
            context.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

            // Text
            context.fillStyle = '#ffffff';
            context.font = `bold ${fontSize}px sans-serif`;
            context.textBaseline = 'middle';

            // Draw Date/Time (Left)
            context.fillText(`${dateStr} ${timeStr}`, 20, canvas.height - (barHeight / 2));

            // Draw Location (Right) - aligned roughly
            const textWidth = context.measureText(locStr).width;
            context.fillText(locStr, canvas.width - textWidth - 20, canvas.height - (barHeight / 2));

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
