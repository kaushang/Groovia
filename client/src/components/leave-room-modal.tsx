import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LeaveRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLeaving: boolean;
}

export default function LeaveRoomModal({
    isOpen,
    onClose,
    onConfirm,
    isLeaving,
}: LeaveRoomModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="glass-panel border-white/20 bg-gray text-white max-w-[364px] sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-3xl font-bold mb-2 text-center">
                        Leaving so soon?
                    </DialogTitle>
                    <DialogDescription className="text-gray-300 text-center text-sm text-center">
                        Are you sure you want to leave this room? <br /> You will stop listening to
                        the music.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex space-x-2">
                    <Button
                        type="button"
                        onClick={onClose}
                        variant="ghost"
                        className="flex-1 glass-panel hover:bg-white/10 hover:text-white p-6 md:text-[16px]"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={onConfirm}
                        className="flex-1 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white p-6 md:text-[16px]"
                        disabled={isLeaving}
                    >
                        {isLeaving ? "Leaving..." : "Leave Room"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
