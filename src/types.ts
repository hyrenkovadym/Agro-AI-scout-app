export type AuthMode = "login" | "register";

export type User = {
  id: string;
  name: string;
  email: string;
  language?: "uk" | "en" | string;
  createdAt?: string;
};

export type Client = {
  id: string;
  ownerUserId: string;
  name: string;
  company?: string | null;
  crop?: string | null;
  location?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Diagnosis = {
  problemName: string;
  probablePlant?: string;
  probablePlantAlternatives?: string[];
  botanicalName?: string;
  probability?: string;
  category?: string;
  whatSeen?: string;
  confidence?: number;
  severity?: "low" | "medium" | "high";
  possibleCauses: string[];
  recommendedActions: string[];
  whatToAdd: string[];
  additionalChecks?: string[];
  preventionTips?: string[];
  descriptionImpact?: string;
  notes?: string;
};

export type AnalysisRecord = {
  id: string;
  ownerUserId: string;
  clientId: string;
  clientName: string;
  crop?: string | null;
  createdAt: string;
  diagnosis: Diagnosis;
  context?: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type ClientsResponse = {
  clients: Client[];
};

export type MeResponse = {
  user: User;
};

export type PickedImage = {
  uri: string;
  base64: string;
  mimeType: string;
};

export type SeasonalDiseases = {
  season: "Весна" | "Літо" | "Осінь" | "Зима";
  diseases: string[];
};

export type PlantGuide = {
  id: string;
  name: string;
  subtitle: string;
  seasons: SeasonalDiseases[];
};

export type DiseaseCatalogMatch = {
  plantId: string;
  plantName: string;
  season: SeasonalDiseases["season"];
};

export type DiseaseCatalogItem = {
  key: string;
  disease: string;
  matches: DiseaseCatalogMatch[];
};

export type AuthDraft = {
  name: string;
  email: string;
  password: string;
};

export type ProfileDraft = {
  name: string;
  email: string;
  language: string;
};

export type PasswordDraft = {
  currentPassword: string;
  nextPassword: string;
  repeatPassword: string;
};
