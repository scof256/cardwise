import type { UIMessage } from "ai";

export type OpenUICompanyCard = {
  type: "openui.company-card";
  id: string;
  companyName: string;
  logoUrl: string | null;
  contactPerson: string | null;
  jobTitle: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  location: string | null;
  category: string | null;
  productsServices: string[];
  recordUrl: string | null;
  originalCardUrl: string | null;
};

export type OpenUIDirectoryPayload = {
  protocol: "openui/1.0";
  kind: "directory.results";
  query: string;
  count: number;
  components: OpenUICompanyCard[];
  retrieval: {
    method: string;
    documentCount: number;
    embeddingModel: string;
    rerankModel: string | null;
    scope: "preview" | "workspace";
  };
};

export type CardwiseUIMessage = UIMessage<
  { model?: string; generationId?: string },
  { openui: OpenUIDirectoryPayload }
>;
