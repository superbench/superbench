import {Socket} from "./Socket";
import * as protocol from "./protocol";
import serializeObject from "../serializeObject";

export type MethodHandler = (params: any) => Promise<any>;

export class Server {
    private socket: Socket;
    private methodHandlers: {[method: string]: MethodHandler};

    constructor(socket: Socket) {
        this.socket = socket;
        this.methodHandlers = {};
        this.socket.recv(this.onRecv.bind(this));
    }

    method(name: string, handler: MethodHandler): void {
        this.methodHandlers[name] = handler;
    }

    private createResponsePayload(id: number, result: any): string {
        return JSON.stringify({
            jsonrpc: "2.0",
            id,
            result
        });
    }

    private createErrorResponsePayload(id: number|null, error: protocol.ProtocolError): string {
        return JSON.stringify({
            jsonrpc: "2.0",
            id,
            error
        });
    }

    private onRecv(payload: string): void {
        let r: protocol.Request;
        try {
            r = JSON.parse(payload);
        } catch(e) {
            this.socket.send(this.createErrorResponsePayload(null, {
                code: protocol.ProtocolErrorCode.ParseError,
                message: "Parse error"
            }));
            return;
        }
        if (r.jsonrpc !== "2.0" ||
            r.method == null ||
            r.id == null
           ) {
            this.socket.send(this.createErrorResponsePayload(null, {
                code: protocol.ProtocolErrorCode.InvalidRequest,
                message: "Invalid request"
            }));
            return;
        }
        const methodHandler = this.methodHandlers[r.method];
        if (!methodHandler) {
            this.socket.send(this.createErrorResponsePayload(r.id, {
                code: protocol.ProtocolErrorCode.MethodNotFound,
                message: "Method not found"
            }));
            return;
        }
        methodHandler(r.params).then(result => {
            this.socket.send(JSON.stringify({
                jsonrpc: "2.0",
                id: r.id,
                result
            }));
        }).catch(e => {
            this.socket.send(this.createErrorResponsePayload(r.id, {
                code: protocol.ProtocolErrorCode.ServerError,
                message: serializeObject(e) || "Request failed"
            }));
        });
    }
}
