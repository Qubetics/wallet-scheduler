export interface AnnouncementInterface {
    id: number;
    user_id: string;
    message: string;
    title: string;
    status?: string;
    created_at?: string;
    updated_at?: string;
}