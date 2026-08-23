import type { Application } from "@applyr/contracts";

export const dummyApplications = [
  {
    id: 1,
    company: {
      id: 1,
      name: "Acme Corp",
      website: "https://acmecorp.com",
    },
    role: "Frontend Developer",
    jobPostLink: "https://acmecorp.com/careers/frontend-developer-4821",
    status: "Interview",
    dateApplied: "2026-07-01",
    notes: "Referred by a friend, recruiter reached out first.",
    events: [
      { id: 1, eventType: "Application Submitted", eventDate: "2026-07-01" },
      { id: 2, eventType: "Recruiter Call", eventDate: "2026-07-05" },
      { id: 3, eventType: "Technical Interview", eventDate: "2026-07-12" },
    ],
  },
  {
    id: 2,
    company: {
      id: 2,
      name: "Northwind Traders",
      website: "https://northwindtraders.io",
    },
    role: "Full Stack Engineer",
    jobPostLink: "https://linkedin.com/jobs/view/3847291056",
    status: "Applied",
    dateApplied: "2026-07-10",
    notes: "Found via LinkedIn, requires 2 years experience minimum.",
    events: [
      { id: 4, eventType: "Application Submitted", eventDate: "2026-07-10" },
    ],
  },
  {
    id: 3,
    company: {
      id: 3,
      name: "Globex Industries",
      website: "https://globex.com",
    },
    role: "Backend Developer",
    jobPostLink: "https://globex.com/careers/backend-developer",
    status: "Offer",
    dateApplied: "2026-06-15",
    notes: "Great culture fit, negotiating salary.",
    events: [
      { id: 5, eventType: "Application Submitted", eventDate: "2026-06-15" },
      { id: 6, eventType: "Phone Screen", eventDate: "2026-06-20" },
      { id: 7, eventType: "Onsite Interview", eventDate: "2026-06-28" },
      { id: 8, eventType: "Offer Received", eventDate: "2026-07-08" },
    ],
  },
  {
    id: 4,
    company: {
      id: 4,
      name: "Initech",
      website: "https://initech.com",
    },
    role: "Software Engineer I",
    jobPostLink: "https://initech.com/jobs/swe-1-2026",
    status: "Rejected",
    dateApplied: "2026-06-01",
    notes:
      "Rejected after final round, feedback was positive but chose internal candidate.",
    events: [
      { id: 9, eventType: "Application Submitted", eventDate: "2026-06-01" },
      { id: 10, eventType: "Technical Interview", eventDate: "2026-06-10" },
      { id: 11, eventType: "Rejection Received", eventDate: "2026-06-20" },
    ],
  },
  {
    id: 5,
    company: {
      id: 5,
      name: "Umbrella Tech",
      website: "https://umbrellatech.dev",
    },
    role: "Junior Full Stack Developer",
    jobPostLink: "https://indeed.com/viewjob?jk=9284710a3e",
    status: "Applied",
    dateApplied: "2026-07-14",
    notes: "Applied via company careers page, no response yet.",
    events: [
      { id: 12, eventType: "Application Submitted", eventDate: "2026-07-14" },
    ],
  },
] satisfies Application[];
