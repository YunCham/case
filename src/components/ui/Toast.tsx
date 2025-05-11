// "use client"

// import React, { useEffect, useState } from "react";
// import { X } from "lucide-react";

// export type ToastType = "success" | "error" | "info" | "warning";

// export interface ToastProps {
//   message: string;
//   type?: ToastType;
//   duration?: number;
//   onClose?: () => void;
//   visible?: boolean;
// }

// export const Toast: React.FC<ToastProps> = ({
//   message,
//   type = "info",
//   duration = 1500,
//   onClose,
//   visible = true,
// }) => {
//   const [isVisible, setIsVisible] = useState(visible);

//   useEffect(() => {
//     setIsVisible(visible);
//   }, [visible]);

//   useEffect(() => {
//     if (isVisible && duration > 0) {
//       const timer = setTimeout(() => {
//         setIsVisible(false);
//         if (onClose) onClose();
//       }, duration);

//       return () => clearTimeout(timer);
//     }
//   }, [isVisible, duration, onClose]);

//   if (!isVisible) return null;

//   const getTypeStyles = (): string => {
//     switch (type) {
//       case "success":
//         return "bg-green-500 border-green-600";
//       case "error":
//         return "bg-red-500 border-red-600";
//       case "warning":
//         return "bg-yellow-500 border-yellow-600";
//       case "info":
//       default:
//         return "bg-blue-500 border-blue-600";
//     }
//   };

//   return (
//     <div
//       className={`fixed bottom-4 right-4 z-50 flex items-center p-4 mb-4 rounded-lg shadow-lg border ${getTypeStyles()} text-white max-w-xs`}
//       role="alert"
//     >
//       <div className="ml-3 text-sm font-medium">{message}</div>
//       <button
//         type="button"
//         className="ml-auto -mx-1.5 -my-1.5 text-white hover:text-gray-200 focus:outline-none"
//         onClick={() => {
//           setIsVisible(false);
//           if (onClose) onClose();
//         }}
//         aria-label="Cerrar"
//       >
//         <X size={18} />
//       </button>
//     </div>
//   );
// };

"use client";

import React, { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
  visible?: boolean;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "info",
  duration = 15000,
  onClose,
  visible = true,
}) => {
  const [isVisible, setIsVisible] = useState(visible);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    setIsVisible(visible);
    if (visible) setIsLeaving(false);
  }, [visible]);

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300); // Duración de la animación de salida
  };

  if (!isVisible) return null;

  const getTypeStyles = (): {
    containerClass: string;
    iconColor: string;
    icon: React.ReactNode;
  } => {
    switch (type) {
      case "success":
        return {
          containerClass: "bg-white border-l-4 border-l-green-500",
          iconColor: "text-green-500",
          icon: <CheckCircle size={20} className="text-green-500" />,
        };
      case "error":
        return {
          containerClass: "bg-white border-l-4 border-l-red-500",
          iconColor: "text-red-500",
          icon: <AlertCircle size={20} className="text-red-500" />,
        };
      case "warning":
        return {
          containerClass: "bg-white border-l-4 border-l-yellow-500",
          iconColor: "text-yellow-500",
          icon: <AlertTriangle size={20} className="text-yellow-500" />,
        };
      case "info":
      default:
        return {
          containerClass: "bg-white border-l-4 border-l-blue-500",
          iconColor: "text-blue-500",
          icon: <Info size={20} className="text-blue-500" />,
        };
    }
  };

  const { containerClass, iconColor, icon } = getTypeStyles();

  return (
    <div
      className={`fixed bottom-20 right-4 z-50 flex items-center rounded-md p-3 shadow-lg ${containerClass} max-w-xs transition-all duration-300 ${
        isLeaving ? "translate-y-2 opacity-0" : "opacity-100"
      }`}
      role="alert"
    >
      <div className="flex items-center">
        <div className="mr-3">{icon}</div>
        <div className="text-sm font-medium text-gray-800">{message}</div>
      </div>
      <button
        type="button"
        className={`ml-3 rounded-full p-1 hover:bg-gray-100 ${iconColor} focus:outline-none`}
        onClick={handleClose}
        aria-label="Cerrar"
      >
        <X size={16} />
      </button>
    </div>
  );
};
