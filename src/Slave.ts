import * as WebSocket from "ws";
import * as rpc from "./rpc";
import {AssignParam} from "./Worker";
import {BenchmarkTestResult} from "./Benchmark";
import ValidationInfo from "./ValidationInfo";
import {DEFAULT_PORT} from "./SlaveRunner";

class SlaveRPCSocket implements rpc.Socket {
    private recvHandler: (payload: string) => void;
    private conn: WebSocket;
    constructor(conn: WebSocket) {
        this.conn = conn;
        conn.on("message", (message: string) => {
            if (this.recvHandler) {
                this.recvHandler(message);
            }
        });
    }
    send(payload: string): void {
        this.conn.send(payload);
    }
    recv(callback: (payload: string) => void): void {
        this.recvHandler = callback;
    }
}

export default class Slave {
    workerNum: number;
    assignedWorkerIds: number[];
    addr: string;
    private conn: WebSocket;
    private rpcClient: rpc.Client;
    constructor(addr: string) {
        this.addr = addr.indexOf(":") === -1 ? addr + ":" + DEFAULT_PORT : addr;
        this.assignedWorkerIds = [];
    }
    open(): Promise<void> {
        this.conn = new WebSocket("ws://" + this.addr, {
            perMessageDeflate: false
        });
        return new Promise<void>(resolve => {
            this.conn.on("open", async () => {
                this.rpcClient = new rpc.Client(new SlaveRPCSocket(this.conn));
                this.workerNum = await this.rpcClient.request("getWorkerNum");
                resolve();
            });
        });
    }
    async assignWorkers(params: AssignParam[]): Promise<void> {
        await this.rpcClient.request("assignWorkers", params);
        this.assignedWorkerIds = params.map(p => p.workerId);
    }
    getValidationInfo(): Promise<ValidationInfo> {
        return this.rpcClient.request("getValidationInfo");
    }
    start(): Promise<void> {
        return this.rpcClient.request("start");
    }
    stop(): Promise<void> {
        return this.rpcClient.request("stop");
    }
    finish(): Promise<void> {
        return this.rpcClient.request("finish");
    }
    fetchTestResults(): Promise<BenchmarkTestResult[]> {
        return this.rpcClient.request("fetchTestResults");
    }
    async handleFinished(workerId: number): Promise<BenchmarkTestResult[]> {
        return this.rpcClient.request("handleFinished", workerId);
    }
}
