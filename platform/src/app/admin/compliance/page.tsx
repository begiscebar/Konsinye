import { prisma } from "@/lib/prisma";
import { checkCompanyCompliance } from "@/lib/compliance";

export default async function AdminCompliancePage() {
  const companies = await prisma.company.findMany({ where: { type: "CARRIER" }, orderBy: { name: "asc" } });
  const flagsByCompany = await Promise.all(
    companies.map(async (c) => ({ company: c, flags: await checkCompanyCompliance(c.id) }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Compliance</h1>
        <p className="text-sm text-slate-500">
          Missing/expired documents against the requirements configured for each company. Configure requirements via the
          <code className="mx-1 rounded bg-slate-100 px-1">ComplianceRequirement</code> table — nothing here asserts a
          legal requirement on your behalf.
        </p>
      </div>

      <div className="space-y-4">
        {flagsByCompany.map(({ company, flags }) => (
          <div key={company.id} className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{company.name}</h2>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${flags.length ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                {flags.length ? `${flags.length} issue${flags.length === 1 ? "" : "s"}` : "Compliant"}
              </span>
            </div>
            {flags.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {flags.map((f, i) => (
                  <li key={i} className="text-red-700">
                    {f.requirementName} ({f.documentType.replaceAll("_", " ")}) — {f.reason.replaceAll("_", " ").toLowerCase()}
                    {f.expirationDate ? ` on ${new Date(f.expirationDate).toLocaleDateString()}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {companies.length === 0 && <p className="text-sm text-slate-400">No carrier companies yet.</p>}
      </div>
    </div>
  );
}
