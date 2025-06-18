export interface AnnouncementInterface {
    id: number;
    message: string;
    title?: string;
    status?: string | null;
    imagePath?:string;
    type?: string;
    created_at?: string;
    updated_at?: string;
}