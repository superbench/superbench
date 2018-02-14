// based on JSON-RPC 2.0 http://www.jsonrpc.org/specification

export enum ProtocolErrorCode {
    ParseError = -32700,
    InvalidRequest = -32600,
    MethodNotFound = -32601,
    InvalidParams = -32602,
    InternalError = -32603,
    ServerError = -32000
}

export interface Request {
    jsonrpc: "2.0";
    method: string;
    id: number;
    params?: any;
}

export interface ProtocolError {
    code: number;
    message: string;
}

export interface Response {
    jsonrpc: "2.0";
    id: number|null;
    result?: any;
    error?: ProtocolError;
}
