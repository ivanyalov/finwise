"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-24"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full glass rounded-3xl shadow-2xl overflow-hidden",
          "border-2 border-gray-200 dark:border-gray-700",
          sizes[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 glass border-b-2 border-gray-200 dark:border-gray-700 flex items-center justify-between p-6 z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} className="text-gray-700 dark:text-gray-400" />
          </button>
        </div>
        <div 
          className="max-h-[calc(90vh-200px)] overflow-y-auto p-6 pb-8"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent'
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

