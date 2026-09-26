import { toast } from "react-toastify";

export const notifySuccess = (message: string): void => {
  toast.success(message, {
    position: "top-right",
  });
};

export const notifyError = (message: string): void => {
  toast.error(message, {
    position: "top-left",
  });
};
