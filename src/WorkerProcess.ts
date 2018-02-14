import * as rpc from "./rpc";
import {BenchmarkDefine, BenchmarkTestResult, Benchmark} from "./Benchmark";

class WorkerProcessPRCSocket implements rpc.Socket {
    private recvHandler: (payload: string) => void;
    constructor() {
        process.on("message", (message: string) => {
            if (this.recvHandler) {
                this.recvHandler(message);
            }
        });
    }
    send(payload: string): void {
        if (!process.send) {
            throw new Error("process.send is undefined");
        }
        process.send(payload);
    }
    recv(callback: (payload: string) => void): void {
        this.recvHandler = callback;
    }
}

export default class WorkerProcess {
    private rpcSocket: rpc.Socket;
    private rpcServer: rpc.Server;
    private workerId: number|null;
    private running: {resolve: () => void, reject: (error: Error) => void};
    private benchmarkDefine: BenchmarkDefine;
    private benchmark: Benchmark|null;
    private handleFinishResolve: ((results: BenchmarkTestResult[]) => void)|null;
    private finished: boolean;
    constructor(benchmarkDefine: BenchmarkDefine) {
        this.rpcSocket = new WorkerProcessPRCSocket();
        this.rpcServer = new rpc.Server(this.rpcSocket);
        this.workerId = null;
        this.rpcServer.method("assign", this.onAssign.bind(this));
        this.rpcServer.method("start", this.onStart.bind(this));
        this.rpcServer.method("handleFinished", this.onHandleFinished.bind(this));
        this.rpcServer.method("fetchFinishedResults", this.onFetchFinishedResults.bind(this));
        this.rpcServer.method("finish", this.onFinish.bind(this));
        this.benchmarkDefine = benchmarkDefine;
        this.benchmark = null;
        this.finished = false;
    }
    run(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.running = {resolve, reject};
        });
    }
    private async onAssign(params: {workerId: number, requestNum: number, workers: {workerId: number, requestNum: number}[]}): Promise<void> {
        this.workerId = params.workerId;
        this.benchmark = new Benchmark(
            params.requestNum,
            this.workerId,
            params.workers
        );
    }
    private async onStart(): Promise<void> {
        process.nextTick(async () => {
            if (this.benchmark == null) {
                throw new Error("A worker process tried to start a benchmark, but the benchmark is not initialized.");
            }
            await this.benchmarkDefine.task(this.benchmark);
            if (this.handleFinishResolve) {
                this.handleFinishResolve(this.benchmark.fetchFinishedTests());
                this.handleFinishResolve = null;
                this.finished = true;
            }
        });
    }
    private async onFetchFinishedResults(): Promise<BenchmarkTestResult[]> {
        if (this.benchmark == null) {
            throw new Error("A worker process tried to fetch results, but the benchmark is not initialized.");
        }
        return this.benchmark.fetchFinishedTests();
    }
    private onHandleFinished(): Promise<BenchmarkTestResult[]> {
        if (this.benchmark == null) {
            return Promise.reject(new Error("A worker process tried to finish a benchmark, but the benchmark is not initialized."));
        }
        if (this.handleFinishResolve) {
            return Promise.reject(new Error("A worker process tried to handle a benchmark finished event, but it is already handled."));
        }
        return new Promise<BenchmarkTestResult[]>(resolve => {
            this.handleFinishResolve = resolve;
        });
    }
    private async onFinish(): Promise<void> {
        if (this.benchmark == null) {
            throw new Error("A worker process tried to finish a benchmark, but the benchmark is not initialized.");
        }
        if (!this.finished) {
            this.benchmark.requestFinish();
        }
    }
}
