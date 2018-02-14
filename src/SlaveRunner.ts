import * as WebSocket from "ws";
import * as cluster from "cluster";
import * as rpc from "./rpc";
import {BenchmarkDefine, BenchmarkTestResult} from "./Benchmark";
import Worker, {AssignParam} from "./Worker";
import ValidationInfo from "./ValidationInfo";

export const DEFAULT_PORT = 8080;

class SlaveRunnerRPCSocket implements rpc.Socket {
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

export default class SlaveRunner {
    private workers: Worker[];
    private benchmarkDefine: BenchmarkDefine;
    private assignedWorkers: Worker[];
    private rpcServer: rpc.Server;
    private port: number;
    private startResolve: () => void;
    private wss: WebSocket.Server;
    private validationInfo: ValidationInfo;
    constructor(params: {
        clusterWorkers: cluster.Worker[],
        benchmarkDefine: BenchmarkDefine,
        port?: number,
        validationInfo: ValidationInfo
    }) {
        this.benchmarkDefine = params.benchmarkDefine;
        this.workers = params.clusterWorkers.map(clusterWorker => new Worker(clusterWorker));
        this.port = params.port || DEFAULT_PORT;
        this.assignedWorkers = [];
        this.validationInfo = params.validationInfo;
    }
    async start(): Promise<void> {
        console.log("waiting for master connection...");
        this.rpcServer = await this.waitMaster();
        console.log("master connection established");
        return new Promise<void>(resolve => {
            this.startResolve = resolve;
        });
    }
    private waitMaster(): Promise<rpc.Server> {
        this.wss = new WebSocket.Server({port: this.port});
        return new Promise<rpc.Server>(resolve => {
            this.wss.once("connection", ws => {
                const rpcServer = new rpc.Server(new SlaveRunnerRPCSocket(ws));
                rpcServer.method("getValidationInfo", this.onGetValidationInfo.bind(this));
                rpcServer.method("start", this.onStart.bind(this));
                rpcServer.method("stop", this.onStop.bind(this));
                rpcServer.method("finish", this.onFinish.bind(this));
                rpcServer.method("fetchTestResults", this.onFetchTestResults.bind(this));
                rpcServer.method("handleFinished", this.onHandleFinished.bind(this));
                rpcServer.method("getWorkerNum", this.onGetWorkerNum.bind(this));
                rpcServer.method("assignWorkers", this.onAssignWorkers.bind(this));
                resolve(rpcServer);
            });
        });
    }
    private async onGetValidationInfo(): Promise<ValidationInfo> {
        return this.validationInfo;
    }
    private async onStop(): Promise<void> {
        process.nextTick(() => {
            this.wss.close(() => {
                console.log("finished");
                this.startResolve();
            });
        });
    }
    private async onGetWorkerNum(): Promise<number> {
        return this.workers.length;
    }
    private async onAssignWorkers(params: AssignParam[]): Promise<void> {
        await Promise.all(params.map(async (param, i) => {
            await this.workers[i].assign(param);
            this.assignedWorkers.push(this.workers[i]);
        }));
        console.log(`${this.assignedWorkers.length} workers are assigned.`);
    }
    private async onStart(): Promise<void> {
        await Promise.all(this.assignedWorkers.map(w => w.start()));
        console.log("running");
    }
    private async onFinish(): Promise<void> {
        await Promise.all(this.assignedWorkers.map(w => w.finish()));
    }
    private async onFetchTestResults(): Promise<BenchmarkTestResult[]> {
        const results = await Promise.all(this.assignedWorkers.map(w => w.fetchTestResults()));
        let ret: BenchmarkTestResult[] = [];
        results.forEach(result => (ret = ret.concat(result)));
        return ret;
    }
    private async onHandleFinished(workerId: number): Promise<BenchmarkTestResult[]> {
        const workers = this.assignedWorkers.filter(w => w.workerId === workerId);
        if (workers.length === 0) {
            throw new Error(`worker ${workerId} is not found`);
        }
        return workers[0].handleFinished();
    }
}
