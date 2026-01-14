import * as React from "react";
import { cn } from "../../lib/utils";

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      checked = false,
      onCheckedChange,
      disabled = false,
      "aria-label": ariaLabel = "Toggle",
      ...props
    },
    ref
  ) => {
    const isChecked = checked === true; // force boolean

    const toggle = () => {
      if (disabled) return;
      onCheckedChange?.(!isChecked);
    };

    return (
      <button
        type="button"
        role="switch"
        aria-checked={isChecked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        className={cn(
          "switch-track inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isChecked ? "is-on" : "is-off",
          className
        )}
        ref={ref}
        {...props}
      >
        <span
          className={cn(
            "switch-thumb pointer-events-none block h-5 w-5 rounded-full shadow-lg transition-transform",
            isChecked ? "translate-x-5 is-on" : "translate-x-0 is-off"
          )}
        />
      </button>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };
