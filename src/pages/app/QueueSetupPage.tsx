import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Trash2, Loader2 } from "lucide-react";
import QueueForm from "@/components/QueueForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQueueStore } from "@/stores/queueStore";
import type { Queue } from "@/types/queue";

export default function QueueSetupPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id && id !== "new";

  const { items: queues, fetchById, remove: removeQueue } = useQueueStore();

  const [queue, setQueue] = useState<Queue | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Delete dialog state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!isEdit) {
      navigate("/app/queues", { replace: true });
      return;
    }

    // Try to find in store first
    const existing = queues.find((q) => q.id === id);
    if (existing) {
      setQueue(existing);
      setIsLoading(false);
      return;
    }

    // Fallback: fetch from API
    setIsLoading(true);
    fetchById(id!).then((q) => {
      setQueue(q ?? null);
      setIsLoading(false);
    });
  }, [fetchById, id, isEdit, navigate, queues]);

  const handleDelete = async () => {
    if (!isEdit || !id) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      const ok = await removeQueue(id);
      if (!ok) {
        setDeleteError("Failed to delete queue. Please try again.");
        return;
      }
      setIsDeleteOpen(false);
      navigate("/app/queues");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSuccess = () => {
    navigate("/app/queues");
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-dark-400" />
      </div>
    );
  }

  const DialogDeleteButton = (
    <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-neon-red border border-neon-red/30 hover:border-neon-red/50 hover:bg-neon-red/5 rounded-xl transition-all"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete queue?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the queue{" "}
            <span className="font-mono">{id}</span>.
          </DialogDescription>
        </DialogHeader>
        {deleteError && (
          <p className="text-sm text-neon-red font-mono">{deleteError}</p>
        )}
        <DialogFooter className="pt-2">
          <button
            type="button"
            onClick={() => setIsDeleteOpen(false)}
            className="px-5 py-2.5 text-sm font-semibold text-dark-300 hover:text-foreground border border-dark-600/50 hover:border-dark-500/60 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-neon-red/80 hover:bg-neon-red disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl text-dark-400 hover:text-foreground hover:bg-dark-700/50 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">Edit Queue</h2>
          <p className="text-sm text-dark-300 mt-0.5">
            Editing configuration for queue "{id}"
          </p>
        </div>

        {/* Delete button */}
        {DialogDeleteButton}
      </div>

      <div className="pb-6">
        <QueueForm
          queue={queue}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
