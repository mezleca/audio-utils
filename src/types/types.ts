export interface INativeAudio {
    get_duration(call_id: number, path: string): number | null;
    get_last_error(call_id: number): string | null;
}
