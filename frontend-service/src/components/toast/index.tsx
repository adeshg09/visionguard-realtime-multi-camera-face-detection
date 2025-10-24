/* Imports */
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------------

/* Types */
type ToastProps = {
  message: string;
  description?: string;
};

// ----------------------------------------------------------------------

/**
 * Toast component to show different types of toast messages
 *
 * @component
 */
const Toast = {
  success: ({ message, description }: ToastProps) => {
    toast.custom(
      (t) => (
        <div
          className={cn(
            "flex items-start gap-3 p-4 w-full max-w-sm bg-card border border-border/50 rounded-lg shadow-lg backdrop-blur-sm",
            "animate-in slide-in-from-right-2 duration-300"
          )}
        >
          {/* Icon Container */}
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-semibold text-foreground leading-tight">
              {message}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={() => toast.dismiss(t)}
            className="flex-shrink-0 w-5 h-5 text-muted-foreground hover:text-foreground transition-colors duration-200 hover:bg-muted/50 rounded flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ),
      {
        duration: 2000,
      }
    );
  },

  error: ({ message, description }: ToastProps) => {
    toast.custom(
      (t) => (
        <div
          className={cn(
            "flex items-start gap-3 p-4 w-full max-w-sm bg-card border border-border/50 rounded-lg shadow-lg backdrop-blur-sm",
            "animate-in slide-in-from-right-2 duration-300"
          )}
        >
          {/* Icon Container */}
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-semibold text-foreground leading-tight">
              {message}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={() => toast.dismiss(t)}
            className="flex-shrink-0 w-5 h-5 text-muted-foreground hover:text-foreground transition-colors duration-200 hover:bg-muted/50 rounded flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ),
      {
        duration: 2000,
      }
    );
  },

  warning: ({ message, description }: ToastProps) => {
    toast.custom(
      (t) => (
        <div
          className={cn(
            "flex items-start gap-3 p-4 w-full max-w-sm bg-card border border-border/50 rounded-lg shadow-lg backdrop-blur-sm",
            "animate-in slide-in-from-right-2 duration-300"
          )}
        >
          {/* Icon Container */}
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-8 h-8 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-semibold text-foreground leading-tight">
              {message}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={() => toast.dismiss(t)}
            className="flex-shrink-0 w-5 h-5 text-muted-foreground hover:text-foreground transition-colors duration-200 hover:bg-muted/50 rounded flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ),
      {
        duration: 2000,
      }
    );
  },

  info: ({ message, description }: ToastProps) => {
    toast.custom(
      (t) => (
        <div
          className={cn(
            "flex items-start gap-3 p-4 w-full max-w-sm bg-card border border-border/50 rounded-lg shadow-lg backdrop-blur-sm",
            "animate-in slide-in-from-right-2 duration-300"
          )}
        >
          {/* Icon Container */}
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20">
              <Info className="w-4 h-4 text-blue-600" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-semibold text-foreground leading-tight">
              {message}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={() => toast.dismiss(t)}
            className="flex-shrink-0 w-5 h-5 text-muted-foreground hover:text-foreground transition-colors duration-200 hover:bg-muted/50 rounded flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ),
      {
        duration: 2000,
      }
    );
  },
};

export default Toast;
