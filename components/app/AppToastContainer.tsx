"use client";

import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Info,
  LoaderCircle,
  TriangleAlert,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  ToastContainer,
  toast,
  type CloseButtonProps,
  type IconProps,
  type ToastOptions,
  type ToastPosition,
  type TypeOptions,
} from "react-toastify";

import { cn } from "@/lib/shadcn_utils";

type AppToastType = TypeOptions | "loading";

type AppToastContentProps = {
  title: ReactNode;
  description?: ReactNode;
};

type ShowAppToastOptions = AppToastContentProps & {
  type?: AppToastType;
  options?: ToastOptions;
};

const toastTypes: Record<TypeOptions, TypeOptions> = {
  default: "default",
  success: "success",
  error: "error",
  info: "info",
  warning: "warning",
};

function AppToastContent({ title, description }: AppToastContentProps) {
  return (
    <div className="app-toast-content">
      <div className="app-toast-title">{title}</div>
      {description ? <div className="app-toast-description">{description}</div> : null}
    </div>
  );
}

function AppToastIcon({ type, isLoading }: IconProps) {
  if (isLoading) {
    return (
      <LoaderCircle className="app-toast-icon app-toast-icon-loading app-toast-icon-default" />
    );
  }

  const Icon =
    type === "success"
      ? CheckCircle2
      : type === "error"
        ? AlertCircle
        : type === "warning"
          ? TriangleAlert
          : type === "info"
            ? Info
            : Bell;

  return <Icon className={cn("app-toast-icon", `app-toast-icon-${toastTypes[type]}`)} />;
}

function AppToastCloseButton({ closeToast, ariaLabel }: CloseButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? "Close notification"}
      className="app-toast-close"
      onClick={(event) => {
        event.stopPropagation();
        closeToast(true);
      }}
    >
      <X className="size-4" />
    </button>
  );
}

function getToastClassName(context?: {
  defaultClassName?: string;
  type?: TypeOptions;
  position?: ToastPosition;
}) {
  const type = context?.type ?? "default";

  return cn(context?.defaultClassName, "app-toast", `app-toast-${toastTypes[type]}`);
}

function getProgressClassName(context?: { defaultClassName?: string; type?: TypeOptions }) {
  const type = context?.type ?? "default";

  return cn(
    context?.defaultClassName,
    "app-toast-progress",
    `app-toast-progress-${toastTypes[type]}`,
  );
}

export function showAppToast({
  type = "default",
  title,
  description,
  options,
}: ShowAppToastOptions) {
  const content = <AppToastContent title={title} description={description} />;

  if (type === "loading") {
    return toast(content, {
      ...options,
      autoClose: options?.autoClose ?? 4500,
      icon: () => (
        <LoaderCircle className="app-toast-icon app-toast-icon-loading app-toast-icon-default" />
      ),
    });
  }

  if (type === "success") return toast.success(content, options);
  if (type === "error") return toast.error(content, options);
  if (type === "warning") return toast.warning(content, options);
  if (type === "info") return toast.info(content, options);

  return toast(content, options);
}

export function AppToastContainer() {
  return (
    <ToastContainer
      position="bottom-right"
      autoClose={4500}
      closeButton={AppToastCloseButton}
      closeOnClick={false}
      draggable="touch"
      hideProgressBar={false}
      icon={AppToastIcon}
      limit={8}
      pauseOnFocusLoss
      pauseOnHover
      progressClassName={getProgressClassName}
      theme="light"
      toastClassName={getToastClassName}
      className="app-toast-container"
    />
  );
}
