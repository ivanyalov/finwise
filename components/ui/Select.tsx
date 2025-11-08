"use client";

import { useState, useRef, useEffect, forwardRef } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectProps {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const Select = forwardRef<HTMLDivElement, SelectProps>(
  ({ className, label, error, options, value, onChange }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
      }
    }, [isOpen]);

    const selectedOption = options.find((opt) => opt.value === value) || options[0];

    return (
      <div ref={selectRef} className={cn("w-full relative", className)}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {label}
          </label>
        )}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full px-4 py-3 rounded-xl border-2",
            "border-gray-200 dark:border-gray-700",
            "glass text-gray-900 dark:text-white",
            "focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:focus:ring-gray-600 dark:focus:border-gray-600",
            "hover:border-gray-300 dark:hover:border-gray-600",
            "transition-all duration-200",
            "flex items-center justify-between",
            error && "border-red-500 focus:ring-red-500 focus:border-red-500"
          )}
        >
          <span className="text-sm font-medium">{selectedOption.label}</span>
          <ChevronDown
            size={18}
            className={cn(
              "text-gray-500 dark:text-gray-400 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full mt-2 left-0 w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-xl z-20 overflow-hidden animate-fadeIn bg-white dark:bg-[#0f0f0f]">
              <div className="max-h-60 overflow-y-auto" style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent'
              }}>
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
                      "hover:bg-indigo-600 dark:hover:bg-indigo-600",
                      value === option.value && "bg-indigo-600 dark:bg-indigo-600"
                    )}
                  >
                    <span className={cn(
                      "text-sm font-medium",
                      value === option.value 
                        ? "text-white" 
                        : "text-gray-900 dark:text-white"
                    )}>
                      {option.label}
                    </span>
                    {value === option.value && (
                      <Check size={16} className="text-white flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;
