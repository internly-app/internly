import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NumberInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "type"> {
  allowDecimal?: boolean;
  onValueChange: (value: string) => void;
  value: string | number;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, allowDecimal = false, onValueChange, value, ...props }, ref) => {
    const pattern = allowDecimal ? /^\d*\.?\d*$/ : /^\d+$/;
    const preventKeys = allowDecimal ? ["e", "E", "+", "-"] : ["e", "E", "+", "-", "."];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      // Allow empty value or values matching the pattern
      if (inputValue === "" || pattern.test(inputValue)) {
        onValueChange(inputValue);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Prevent unwanted characters
      if (preventKeys.includes(e.key)) {
        e.preventDefault();
      }

      // Call original onKeyDown if provided
      props.onKeyDown?.(e);
    };

    return (
      <Input
        type="number"
        className={cn(className)}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        ref={ref}
        {...props}
      />
    );
  }
);

NumberInput.displayName = "NumberInput";

export { NumberInput };