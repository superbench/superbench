export interface Socket {
    send: (payload: string) => void;
    recv: (callback: (payload: string) => void) => void;
}
