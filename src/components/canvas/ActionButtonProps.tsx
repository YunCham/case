import React from "react";

interface ActionButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  isLoading?: boolean;
  title?: string;
  disabled?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  onClick,
  isLoading = false,
  title = "",
  disabled = false,
}) => {
  const isDisabled = isLoading || disabled;

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={isDisabled}
      className={`${
        isDisabled
          ? "bg-blue-800 text-gray-400 cursor-not-allowed"
          : "bg-gradient-to-r from-blue-800 to-pink-600 text-white hover:from-blue-600 hover:to-pink-700"
      } flex h-10 w-10 items-center justify-center rounded-full p-3 shadow-md transition-all duration-200`}
    >
      {isLoading ? (
        <svg
          className="h-5 w-5 animate-spin text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 
            0 0 5.373 0 12h4zm2 5.291A7.962 
            7.962 0 014 12H0c0 3.042 1.135 
            5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : (
        icon
      )}
    </button>
  );
};
