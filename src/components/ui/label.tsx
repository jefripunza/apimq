import * as React from "react";

import { cn } from "@/lib/utils";

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }
>(({ className, required, children, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("block text-sm font-medium text-dark-200 mb-1.5", className)}
    {...props}
  >
    {children}
    {required && <span className="text-neon-red ml-1">*</span>}
  </label>
));
Label.displayName = "Label";

export { Label };
