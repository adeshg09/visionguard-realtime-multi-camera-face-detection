/* Imports */
import { useEffect, useState, type JSX } from "react";

// ----------------------------------------------------------------------

/**
 * component that prompts the user to install the PWA
 * @returns {JSX.Element | null} The component to be rendered or null if the component should not be rendered
 */
export const PWAInstallPrompt = (): JSX.Element | null => {
  /* State */
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  /* Functions */
  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowInstallPrompt(false);
      console.log("User accepted the install prompt");
    }
    setDeferredPrompt(null);
  };

  const handleClose = () => {
    setShowInstallPrompt(false);
  };

  /* Side-Effects */
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  /* Output */
  return (
    <>
      {showInstallPrompt && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Install VisionGuard</h3>
              <p className="text-blue-100 text-sm mt-1">
                Install for better experience and quick access
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:text-blue-200 text-lg"
            >
              ×
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="flex-1 bg-white text-blue-600 px-4 py-2 rounded font-medium hover:bg-blue-50 transition-colors"
            >
              Install
            </button>
            <button
              onClick={handleClose}
              className="flex-1 bg-blue-700 text-white px-4 py-2 rounded font-medium hover:bg-blue-800 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      )}
    </>
  );
};
