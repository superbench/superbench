import {Socket} from "./Socket";
import * as protocol from "./protocol";

export class ClientProtocolError implements Error {
    name: string;
    message: string;
    code: number;
    constructor(error: protocol.ProtocolError) {
        this.name = "ClientProtocolError";
        this.message = error.message;
        this.code = error.code;
    }
}

export class Client {
    private socket: Socket;
    private nextId: number;
    private waitingRequests: {[id: number]: {resolve: (result: any) => void, reject: (err: ClientProtocolError) => void}};
    constructor(socket: Socket) {
        this.socket = socket;
        this.nextId = 1;
        this.waitingRequests = {};
        this.socket.recv(this.onRecv.bind(this));
    }
    request(method: string, params?: any): Promise<any> {
        const id = this.nextId++;
        return new Promise<any>((resolve, reject) => {
            this.socket.send(JSON.stringify({
                jsonrpc: "2.0",
                method,
                id,
                params
            }));
            this.waitingRequests[id] = {resolve, reject}
        });
    }
    private onRecv(payload: string): void {
        const p: protocol.Response = JSON.parse(payload);
        if (p.jsonrpc !== "2.0" || p.id == null) {
            throw new Error("invalid payload");
        }
        const waitingRequest = this.waitingRequests[p.id];
        if (!waitingRequest) {
            throw new Error("no waiting request");
        }
        delete this.waitingRequests[p.id];
        if (p.error) {
            waitingRequest.reject(new ClientProtocolError(p.error));
        } else {
            waitingRequest.resolve(p.result);
        }
    }
}
