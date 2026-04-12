import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SignOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export default function SignOutModal({
  isOpen,
  onClose,
  onConfirm,
}: SignOutModalProps) {
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async () => {
    setIsPending(true);
    try {
      await onConfirm();
    } finally {
      setIsPending(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="glass-panel border-white/20 bg-gray text-white max-w-[364px] sm:max-w-md"
        data-testid="sign-out-modal"
      >
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold mb-0 text-center">
            Sign Out
          </DialogTitle>
        </DialogHeader>

        <div className="text-center text-white/80 md:text-[16px]">
          Are you sure you want to sign out?
        </div>

        <div className="flex space-x-2">
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            className="flex-1 glass-panel hover:bg-white/10 hover:text-white p-6 md:text-[16px]"
            data-testid="button-cancel-signout"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 p-6 md:text-[16px]"
            data-testid="button-confirm-signout"
          >
            {isPending ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
