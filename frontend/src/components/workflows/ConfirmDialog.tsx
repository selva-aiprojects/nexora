import { Modal } from '../Modal';
import { Button } from '../Button';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  message?: string;
  confirmLabel?: string;
  confirmTone?: 'danger' | 'primary' | 'secondary';
  tone?: 'danger' | 'primary' | 'secondary';
  variant?: 'danger' | 'primary' | 'secondary';
  loading?: boolean;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  message,
  confirmLabel = 'Confirm',
  confirmTone = 'primary',
  tone,
  variant,
  loading = false,
  isLoading = false,
}: ConfirmDialogProps) {
  const resolvedTone = variant ?? tone ?? confirmTone;
  const busy = loading || isLoading;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={message ?? description}
      children={null}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={resolvedTone === 'danger' ? 'danger' : resolvedTone === 'secondary' ? 'secondary' : 'primary'}
            onClick={onConfirm}
            isLoading={busy}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
