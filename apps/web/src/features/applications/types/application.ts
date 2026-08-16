export type ApplicationStatus = "Applied" | "Interview" | "Offer" | "Rejected";

export interface Company {
  id: number;
  name: string;
  website: string;
}

export interface ApplicationEvent {
  id: number;
  eventType: string;
  eventDate: string;
}

export interface Application {
  id: number;
  company: Company;
  role: string;
  jobPostLink: string;
  status: ApplicationStatus;
  dateApplied: string;
  notes: string;
  events: ApplicationEvent[];
}
