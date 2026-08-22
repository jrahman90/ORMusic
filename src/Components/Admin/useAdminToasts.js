import { useCallback, useState } from "react";
import { Toast, ToastContainer } from "react-bootstrap";

const DEFAULT_TITLES = {
  success: "Done",
  danger: "Something went wrong",
  warning: "Needs attention",
  info: "Note",
};

export function useAdminToasts() {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message, options = {}) => {
    const variant = options.variant || "success";
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setToasts((current) => [
      ...current.slice(-4),
      {
        id,
        message,
        title: options.title || DEFAULT_TITLES[variant] || DEFAULT_TITLES.info,
        variant,
        delay: options.delay ?? 4500,
      },
    ]);
  }, []);

  return { removeToast, showToast, toasts };
}

export function AdminToastOutlet({ toasts, onClose }) {
  if (!toasts.length) return null;

  return (
    <ToastContainer className="admin-toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          autohide
          className={`admin-toast admin-toast-${toast.variant}`}
          delay={toast.delay}
          onClose={() => onClose(toast.id)}
          show
        >
          <Toast.Header>
            <strong className="me-auto">{toast.title}</strong>
          </Toast.Header>
          <Toast.Body>{toast.message}</Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
}
