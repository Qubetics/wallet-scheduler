export interface AnnouncementInterface {
    id: number;
    message: string;
    title: string;
    status?: string | null;
    created_at?: string;
    updated_at?: string;
}