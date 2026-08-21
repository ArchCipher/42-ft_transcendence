export type DocumentAccess = "OWNER" | "EDITOR" | "VIEWER"


export type DocumentSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    username: string;
  }
  access: DocumentAccess;
  canRename: boolean;
  canDelete: boolean;
}
