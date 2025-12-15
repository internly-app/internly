"use client";

import { CustomSelect } from "@/components/CustomSelect";

// Generate terms dynamically based on current year
const generateTerms = () => {
  const currentYear = new Date().getFullYear();
  const terms = [];
  
  // Generate terms for current year and next 2 years, previous 4 years
  for (let year = currentYear - 4; year <= currentYear + 2; year++) {
    terms.push(`Summer ${year}`);
    terms.push(`Fall ${year}`);
    terms.push(`Winter ${year}`);
    terms.push(`Spring ${year}`);
  }
  
  // Sort by year descending, then by season priority within year
  const seasonOrder = { "Summer": 1, "Fall": 2, "Winter": 3, "Spring": 4 };
  
  return terms.sort((a, b) => {
    const [seasonA, yearA] = a.split(" ");
    const [seasonB, yearB] = b.split(" ");
    
    const yearDiff = parseInt(yearB) - parseInt(yearA);
    if (yearDiff !== 0) return yearDiff;
    
    return seasonOrder[seasonA as keyof typeof seasonOrder] - seasonOrder[seasonB as keyof typeof seasonOrder];
  });
};

interface TermSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export function TermSelect({
  value,
  onChange,
  disabled = false,
  required = false,
}: TermSelectProps) {
  const terms = generateTerms();
  const options = terms.map((term) => ({
    value: term,
    label: term,
  }));

  return (
    <CustomSelect
      value={value}
      onChange={onChange}
      options={options}
      placeholder="Select term..."
      disabled={disabled}
      required={required}
      searchable={false}
    />
  );
}