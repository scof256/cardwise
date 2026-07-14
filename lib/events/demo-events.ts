export type EventSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  eventType: string;
  category: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  venueName: string;
  city: string;
  country: string;
  isVirtual: boolean;
  status: "draft" | "scheduled" | "live" | "completed" | "cancelled" | "archived";
  moderationStatus: "not_submitted" | "pending" | "approved" | "changes_requested" | "rejected" | "suspended";
  visibility: "public" | "unlisted" | "workspace_only" | "invite_only";
  directoryAccess: "public" | "signed_in" | "approved_participants" | "disabled";
  participantCount: number;
  companyCount: number;
  sponsored: boolean;
  organizerName: string;
  accent: "coral" | "navy" | "green" | "ochre";
};

export type EventDirectoryCard = {
  id: string;
  participantId: string;
  companyName: string;
  displayName: string;
  jobTitle: string;
  email: string;
  phone: string;
  website: string;
  location: string;
  category: string;
  services: string[];
  participantType: "organizer" | "sponsor" | "exhibitor" | "speaker" | "company" | "attendee";
  attendanceStatus: "unknown" | "registered" | "checked_in" | "organizer_confirmed" | "no_show";
  cardPreviewUrl?: string;
};

export const demoEvents: EventSummary[] = [
  {
    id: "evt-east-africa-business-expo",
    slug: "east-africa-business-expo-2026",
    title: "East Africa Business Expo 2026",
    summary: "Meet founders, procurement teams, and service providers building the region's next generation of businesses.",
    description: "A practical two-day networking and exhibition event connecting established companies, growing teams, and independent professionals across East Africa.",
    eventType: "Business expo",
    category: "Business & Trade",
    startsAt: "2026-08-21T06:00:00.000Z",
    endsAt: "2026-08-22T15:00:00.000Z",
    timezone: "Africa/Kampala",
    venueName: "UMA Show Grounds",
    city: "Kampala",
    country: "Uganda",
    isVirtual: false,
    status: "scheduled",
    moderationStatus: "approved",
    visibility: "public",
    directoryAccess: "public",
    participantCount: 86,
    companyCount: 42,
    sponsored: true,
    organizerName: "East Africa Enterprise Network",
    accent: "coral",
  },
  {
    id: "evt-build-uganda",
    slug: "build-uganda-summit-2026",
    title: "Build Uganda Summit",
    summary: "Construction, engineering, architecture, and property leaders sharing projects and partnerships.",
    description: "A focused industry summit for companies and professionals working across Uganda's built environment.",
    eventType: "Industry summit",
    category: "Construction",
    startsAt: "2026-09-10T05:30:00.000Z",
    endsAt: "2026-09-10T15:30:00.000Z",
    timezone: "Africa/Kampala",
    venueName: "Speke Resort Munyonyo",
    city: "Kampala",
    country: "Uganda",
    isVirtual: false,
    status: "scheduled",
    moderationStatus: "approved",
    visibility: "public",
    directoryAccess: "public",
    participantCount: 54,
    companyCount: 31,
    sponsored: false,
    organizerName: "Build Uganda Forum",
    accent: "navy",
  },
  {
    id: "evt-health-connect",
    slug: "health-connect-kampala-2026",
    title: "Health Connect Kampala",
    summary: "A completed directory of medical suppliers, clinic operators, and health-technology teams.",
    description: "Health Connect brought together medical equipment suppliers, care providers, laboratories, and technology companies.",
    eventType: "Networking conference",
    category: "Healthcare",
    startsAt: "2026-06-18T06:00:00.000Z",
    endsAt: "2026-06-18T15:00:00.000Z",
    timezone: "Africa/Kampala",
    venueName: "Kampala Serena Hotel",
    city: "Kampala",
    country: "Uganda",
    isVirtual: false,
    status: "completed",
    moderationStatus: "approved",
    visibility: "public",
    directoryAccess: "public",
    participantCount: 73,
    companyCount: 38,
    sponsored: false,
    organizerName: "Uganda Health Business Association",
    accent: "green",
  },
];

export const demoEventDirectory: Record<string, EventDirectoryCard[]> = {
  "east-africa-business-expo-2026": [
    { id: "epc-kampala-print", participantId: "ep-kampala-print", companyName: "Kampala Print Studio", displayName: "Amina Nsubuga", jobTitle: "Creative Director", email: "amina@kampalaprint.ug", phone: "+256 772 410 882", website: "kampalaprint.ug", location: "Kampala, Uganda", category: "Printing & Design", services: ["Large format printing", "Brand identity"], participantType: "exhibitor", attendanceStatus: "checked_in" },
    { id: "epc-buildcore", participantId: "ep-buildcore", companyName: "BuildCore Africa", displayName: "Daniel Okello", jobTitle: "Projects Manager", email: "daniel@buildcore.africa", phone: "+256 704 233 918", website: "buildcore.africa", location: "Ntinda, Kampala", category: "Construction", services: ["Commercial construction", "Project planning"], participantType: "company", attendanceStatus: "organizer_confirmed" },
    { id: "epc-medline", participantId: "ep-medline", companyName: "Medline Solutions", displayName: "Grace Atim", jobTitle: "Business Development Lead", email: "grace@medlinesolutions.co.ug", phone: "+256 701 145 522", website: "medlinesolutions.co.ug", location: "Kololo, Kampala", category: "Medical Equipment", services: ["Diagnostic equipment", "Laboratory supplies"], participantType: "sponsor", attendanceStatus: "checked_in" },
  ],
  "build-uganda-summit-2026": [
    { id: "epc-buildcore-summit", participantId: "ep-buildcore-summit", companyName: "BuildCore Africa", displayName: "Daniel Okello", jobTitle: "Projects Manager", email: "daniel@buildcore.africa", phone: "+256 704 233 918", website: "buildcore.africa", location: "Ntinda, Kampala", category: "Construction", services: ["Commercial construction", "Project planning"], participantType: "speaker", attendanceStatus: "registered" },
  ],
  "health-connect-kampala-2026": [
    { id: "epc-medline-health", participantId: "ep-medline-health", companyName: "Medline Solutions", displayName: "Grace Atim", jobTitle: "Business Development Lead", email: "grace@medlinesolutions.co.ug", phone: "+256 701 145 522", website: "medlinesolutions.co.ug", location: "Kololo, Kampala", category: "Medical Equipment", services: ["Diagnostic equipment", "Laboratory supplies"], participantType: "exhibitor", attendanceStatus: "checked_in" },
  ],
};

export function findDemoEvent(slug: string) {
  return demoEvents.find((event) => event.slug === slug) ?? null;
}
