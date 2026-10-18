export type DM = { id: number; sender_id: string; recipient_id: string; content: string; created_at: string; read_at: string | null };
export type Conversation = { userId: string; username: string; last: DM; unread: number };
