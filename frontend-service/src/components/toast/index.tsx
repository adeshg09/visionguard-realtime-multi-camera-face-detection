import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";

type ToastProps = {
  message: string;
  description?: string;
};

const Toast = {
  success: ({ message, description }: ToastProps) => {
    toast.custom(
      (t) => (
        <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl shadow-lg backdrop-blur-sm animate-in slide-in-from-top-2 duration-300">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-900">{message}</p>
            {description && (
              <p className="text-xs text-emerald-700 mt-1 opacity-80">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={() => toast.dismiss(t)}
            className="flex-shrink-0 text-emerald-400 hover:text-emerald-600 transition-colors duration-200"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      ),
      {
        duration: 4000,
      }
    );
  },

  error: ({ message, description }: ToastProps) => {
    toast.custom(
      (t) => (
        <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl shadow-lg backdrop-blur-sm animate-in slide-in-from-top-2 duration-300">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-900">{message}</p>
            {description && (
              <p className="text-xs text-red-700 mt-1 opacity-80">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={() => toast.dismiss(t)}
            className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors duration-200"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      ),
      {
        duration: 5000,
      }
    );
  },

  warning: ({ message, description }: ToastProps) => {
    toast.custom(
      (t) => (
        <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl shadow-lg backdrop-blur-sm animate-in slide-in-from-top-2 duration-300">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">{message}</p>
            {description && (
              <p className="text-xs text-amber-700 mt-1 opacity-80">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={() => toast.dismiss(t)}
            className="flex-shrink-0 text-amber-400 hover:text-amber-600 transition-colors duration-200"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      ),
      {
        duration: 4500,
      }
    );
  },

  info: ({ message, description }: ToastProps) => {
    toast.custom(
      (t) => (
        <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-lg backdrop-blur-sm animate-in slide-in-from-top-2 duration-300">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-900">{message}</p>
            {description && (
              <p className="text-xs text-blue-700 mt-1 opacity-80">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={() => toast.dismiss(t)}
            className="flex-shrink-0 text-blue-400 hover:text-blue-600 transition-colors duration-200"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      ),
      {
        duration: 4000,
      }
    );
  },
};

export { Toast };
