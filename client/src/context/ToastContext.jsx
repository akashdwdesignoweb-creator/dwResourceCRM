import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', title = '') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    const newToast = {
      id,
      message,
      type,
      title: title || (type === 'success' ? 'Success' : type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Information'),
      createdAt: Date.now()
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after 4.5 seconds
    setTimeout(() => {
      dismissToast(id);
    }, 4500);

    return id;
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      
      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto bg-white rounded-xl shadow-xl border flex items-start gap-3 p-4 animate-slideInRight ${
                isSuccess
                  ? 'border-emerald-200 shadow-emerald-500/10'
                  : isError
                  ? 'border-rose-200 shadow-rose-500/10'
                  : isWarning
                  ? 'border-amber-200 shadow-amber-500/10'
                  : 'border-orange-200 shadow-orange-500/10'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isSuccess
                    ? 'bg-emerald-50'
                    : isError
                    ? 'bg-rose-50'
                    : isWarning
                    ? 'bg-amber-50'
                    : 'bg-orange-50'
                }`}
              >
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {isError && <AlertCircle className="w-4 h-4 text-rose-600" />}
                {isWarning && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-[#F3701B]" />}
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm font-semibold text-slate-900">
                  {toast.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed break-words">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="ml-auto p-1 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-slate-600 flex-shrink-0"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
