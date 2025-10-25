/* Imports */
import { type JSX } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ----------------------------------------------------------------------

/* Interface */
interface SnapshotPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotUrl: string | null;
}

// ----------------------------------------------------------------------

/**
 * Component to preview alert snapshot in full size.
 */
const SnapshotPreviewDialog = ({
  open,
  onOpenChange,
  snapshotUrl,
}: SnapshotPreviewDialogProps): JSX.Element => {
  if (!snapshotUrl) return <></>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>Alert Snapshot Preview</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="relative w-full max-h-[70vh] overflow-auto bg-muted/10">
          <img
            src={snapshotUrl}
            alt="Alert snapshot preview"
            className="w-full h-auto object-contain"
          />
        </div>

        <div className="p-4 border-t bg-muted/20">
          <p className="text-xs text-muted-foreground">
            Click outside or press ESC to close
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SnapshotPreviewDialog;
