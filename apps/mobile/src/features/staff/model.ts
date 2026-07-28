export type StaffCredit = {
  episodeInfo?: string;
  id: number;
  imageUrl?: string;
  isOrganization: boolean;
  name: string;
  role: string;
};

export type StaffProvider = {
  getSubjectStaff: (subjectId: number) => Promise<StaffCredit[]>;
};
