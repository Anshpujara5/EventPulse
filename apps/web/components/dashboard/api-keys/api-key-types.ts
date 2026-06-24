export type ApiKeyStatus = "ACTIVE" | "REVOKED";

export type ApiKeyProject = {
  id: string;
  name: string;
  domain: string;
};

export type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  maskedKey: string;
  permissions: string;
  status: ApiKeyStatus;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  project: ApiKeyProject;
};

export type ApiKeyCreateResponse = {
  success: boolean;
  message: string;
  data: {
    apiKey: ApiKey;
    rawApiKey?: string | null;
  };
};

export type ApiKeysResponse = {
  success: boolean;
  data: {
    apiKeys: ApiKey[];
  };
};

export type Project = {
  id: string;
  name: string;
  domain: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
};

export type ProjectsResponse = {
  success: boolean;
  data: {
    projects: Project[];
  };
};
