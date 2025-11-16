import Image from "next/image";
import type { Company, Role } from "@/lib/types/database";

interface CompanyTagProps {
  company: Company;
  role?: Role;
}

export function CompanyTag({ company, role }: CompanyTagProps) {
  return (
    <div className="flex items-center gap-3">
      {company.logo_url && (
        <div className="w-12 h-12 rounded-lg bg-gray-950 border border-gray-800 flex items-center justify-center overflow-hidden">
          <Image
            src={company.logo_url}
            alt={`${company.name} logo`}
            width={48}
            height={48}
            className="object-contain"
          />
        </div>
      )}
      <div>
        <h3 className="font-semibold text-lg text-white">{company.name}</h3>
        {role && <p className="text-sm text-gray-400">{role.title}</p>}
      </div>
    </div>
  );
}
