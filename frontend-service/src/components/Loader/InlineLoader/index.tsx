/* Imports */
import React, { type JSX } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------------

/* Interface */
export interface ButtonLoaderProps {
  /** Size of the loader */
  size?: "sm" | "md" | "lg";
  /** Custom className */
  className?: string;
  /** Loading text to show next to spinner */
  text?: string;
}

// ----------------------------------------------------------------------

/**
 * Loader component for buttons with spinner and optional text
 *
 * @component
 * @param {string} size - Size of the loader (sm, md, lg)
 * @param {string} className - Additional CSS classes
 * @param {string} text - Optional loading text
 * @returns {JSX.Element}
 */

// ----------------------------------------------------------------------

/* Button Loader */
const ButtonLoader: React.FC<ButtonLoaderProps> = ({
  size = "md",
  className,
  text,
}): JSX.Element => {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <Loader2 className={cn("animate-spin", sizeClasses[size], className)} />
      {text && <span>{text}</span>}
    </div>
  );
};

export default ButtonLoader;

// ----------------------------------------------------------------------

/* Spinner Loader */
export const SpinnerLoader: React.FC<{
  size?: "sm" | "md" | "lg";
  className?: string;
}> = ({ size = "md", className }) => {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <Loader2 className={cn("animate-spin", sizeClasses[size], className)} />
  );
};

// ----------------------------------------------------------------------

/* Dots loader */
export const DotsLoader: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn("flex space-x-1", className)}>
      <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="h-2 w-2 bg-current rounded-full animate-bounce"></div>
    </div>
  );
};

// ----------------------------------------------------------------------

/* Pulse loader */
export const PulseLoader: React.FC<{
  size?: "sm" | "md" | "lg";
  className?: string;
}> = ({ size = "md", className }) => {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <div
      className={cn(
        "rounded-full bg-current animate-pulse",
        sizeClasses[size],
        className
      )}
    />
  );
};
