import * as cluster from "cluster";
import * as rpc from "./rpc";
import {BenchmarkTestResult} from "./Benchmark";

export interface AssignParam {
    workerId: number;
    requestNum: number;
    workers: {
        workerId: number;
        requestNum: number;
    }[];
}

class WorkerPRCSocket implements rpc.Socket {
    private clusterWorker: cluster.Worker;
    private recvHandler: (payload: string) => void;
    constructor(clusterWorker: cluster.Worker) {
        this.clusterWorker = clusterWorker;
        clusterWorker.on("message", (message: string) => {
            if (this.recvHandler) {
                this.recvHandler(message);
            }
        });
    }
    send(payload: string): void {
        this.clusterWorker.send(payload);
    }
    recv(callback: (payload: string) => void): void {
        this.recvHandler = callback;
    }
}

export default class Worker {
    workerId: number;
    private rpcSocket: WorkerPRCSocket;
    private rpcClient: rpc.Client;
    constructor(clusterWorker: cluster.Worker) {
        this.rpcSocket = new WorkerPRCSocket(clusterWorker);
        this.rpcClient = new rpc.Client(this.rpcSocket);
    }
    async assign(param: AssignParam): Promise<void> {
        await this.rpcClient.request("assign", param);
        this.workerId = param.workerId;
    }
    async start(): Promise<void> {
        if (this.workerId == null) {
            throw new Error("worker is not assigned");
        }
        await this.rpcClient.request("start");
    }
    async fetchTestResults(): Promise<BenchmarkTestResult[]> {
        if (this.workerId == null) {
            throw new Error("worker is not assigned");
        }
        return await this.rpcClient.request("fetchFinishedResults");
    }
    handleFinished(): Promise<BenchmarkTestResult[]> {
        if (this.workerId == null) {
            throw new Error("worker is not assigned");
        }
        return this.rpcClient.request("handleFinished");
    }
    async finish(): Promise<void> {
        if (this.workerId == null) {
            throw new Error("worker is not assigned");
        }
        await this.rpcClient.request("finish");
    }
}
