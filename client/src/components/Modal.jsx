import { useEffect } from 'react';

const Modal = ({ title, onClose, children, showClose = true, closeOnClickOutside = true }) => {
    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && showClose) onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose, showClose]);

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
            onClick={() => closeOnClickOutside && onClose()}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all scale-100 flex flex-col"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
                <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
                    <h3 className="text-xl font-bold text-slate-800">{title}</h3>
                    {showClose && (
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors font-bold"
                        >
                            &times;
                        </button>
                    )}
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
