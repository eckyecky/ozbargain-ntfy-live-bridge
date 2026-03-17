export interface OzBargainRecord {
  action: string; // "Post", "Update"
  name: string;   // User's name
  uid: number;    // User ID
  user: string;   // HTML string for user icon/link
  title: string;  // Post title
  timestamp: number;
  type: string;   // "Deal", "Comp", "Ad", "Forum"
  link: string;   // Relative link, e.g., "/node/952185"
}

export interface OzBargainResponse {
  timestamp: number;
  records: OzBargainRecord[];
  sessions: number[];
}
