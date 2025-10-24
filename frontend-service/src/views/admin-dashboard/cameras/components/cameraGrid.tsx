/* Imports */
import { type JSX } from "react";
import { Camera } from "lucide-react";

/* Local Imports */
import CameraTile from "./cameraTile";

// ----------------------------------------------------------------------

/* Interface */
interface CameraGridProps {
  cameras: any[];
  onEditCamera: (camera: any) => void;
  onDeleteCamera: (cameraId: string) => void;
  onStartStream: (cameraId: string) => void;
  onStopStream: (cameraId: string) => void;
  loadingCameras: Set<string>;
}

// ----------------------------------------------------------------------

/**
 * Component to display grid of camera tiles.
 *
 * @component
 * @param {CameraGridProps} props - The component props
 * @returns {JSX.Element}
 */
const CameraGrid = ({
  cameras,
  onEditCamera,
  onDeleteCamera,
  onStartStream,
  onStopStream,
  loadingCameras,
}: CameraGridProps): JSX.Element => {
  /* Output */
  if (cameras.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-250px)]">
        <div className="flex flex-col items-center gap-6 max-w-md text-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-muted/50 dark:bg-muted/20 flex items-center justify-center border-2 border-dashed">
              <Camera className="w-12 h-12 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">No Cameras Found</h3>
            <p className="text-muted-foreground">
              Add a camera to start monitoring your spaces in real-time
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 max-h-full overflow-y-auto p-2 hide-scrollbar">
      {cameras.map((camera) => (
        <CameraTile
          key={camera.id}
          camera={camera}
          onEdit={onEditCamera}
          onDelete={onDeleteCamera}
          onStartStream={onStartStream}
          onStopStream={onStopStream}
          isLoading={loadingCameras.has(camera.id)}
        />
      ))}
    </div>
  );
};

export default CameraGrid;
