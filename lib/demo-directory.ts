export type Company = {
  id: string | number;
  name: string;
  initials: string;
  contact: string;
  role: string;
  phone: string;
  email: string;
  site: string;
  location: string;
  category: string;
  services: string[];
  accent: string;
  added: string;
  originalImages?: Array<{ id: string; side: string; url: string }>;
};

export const DEMO_WORKSPACE_ID = "cardwise-preview";

export const demoCompanies: Company[] = [
  { id: "demo-kampala-print", name: "Kampala Print Studio", initials: "KP", contact: "Amina Nsubuga", role: "Creative Director", phone: "+256 772 410 882", email: "amina@kampalaprint.ug", site: "kampalaprint.ug", location: "Kampala, Uganda", category: "Printing & Design", services: ["Large format printing", "Brand identity", "Packaging"], accent: "coral", added: "Today, 10:42" },
  { id: "demo-buildcore", name: "BuildCore Africa", initials: "BC", contact: "Daniel Okello", role: "Projects Manager", phone: "+256 701 332 190", email: "daniel@buildcore.africa", site: "buildcore.africa", location: "Ntinda, Kampala", category: "Construction", services: ["Commercial construction", "Project planning"], accent: "navy", added: "Yesterday" },
  { id: "demo-medline", name: "Medline Solutions", initials: "MS", contact: "Grace Atim", role: "Business Development Lead", phone: "+256 758 920 114", email: "grace@medlinesolutions.co.ug", site: "medlinesolutions.co.ug", location: "Kololo, Kampala", category: "Medical Equipment", services: ["Diagnostic equipment", "Laboratory supplies"], accent: "green", added: "Jul 10, 2026" },
  { id: "demo-harbor-pine", name: "Harbor & Pine Advisory", initials: "HP", contact: "Isaac Mugisha", role: "Managing Partner", phone: "+256 783 006 220", email: "isaac@harborpine.com", site: "harborpine.com", location: "Entebbe, Uganda", category: "Consulting", services: ["Business strategy", "Financial advisory"], accent: "ochre", added: "Jul 8, 2026" },
];

export function companySearchContent(company: Company) {
  return [
    `Company: ${company.name}`,
    `Category: ${company.category}`,
    `Products and services: ${company.services.join(", ")}`,
    `Primary contact: ${company.contact}`,
    `Job title: ${company.role}`,
    `Phone: ${company.phone}`,
    `Email: ${company.email}`,
    `Website: ${company.site}`,
    `Address: ${company.location}`,
    `Date added: ${company.added}`,
  ].join("\n");
}
