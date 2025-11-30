// Centralized form styling constants to avoid repetition

export const FORM_STYLES = {
  // Textarea styling - consistent across all form textareas
  textarea: "flex min-h-[80px] w-full rounded-md border border-zinc-700 bg-transparent px-3 py-1 text-base transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none",
  
  // Dropdown/Select styling - consistent across all form selects
  select: "flex h-9 w-full rounded-md border border-zinc-700 bg-transparent px-3 py-1 text-base transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  
  // Dropdown option hover styling
  dropdownOption: "w-full px-3 py-2 text-left text-sm hover:bg-[#333333] hover:text-foreground focus:bg-[#333333] focus:text-foreground focus:outline-none cursor-pointer transition-colors",
  
  // Grid gap for form sections
  formSection: "grid gap-2",
  
  // Character counter styling
  characterCounter: "text-xs text-muted-foreground text-right",
} as const;