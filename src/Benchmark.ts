import serializeObject from "./serializeObject";

export interface BenchmarkConfig {
    title: string;
    description: string;
    measurementInterval: number;
    duration: number;
    concurrentRequestNum: number;
}

export enum BenchmarkTestEndState {
    Success = 1,
    Error = 2
}

export class BenchmarkTest {
    group: string;
    endState: BenchmarkTestEndState|null;
    beginTime: number;
    endTime: number;
    errorResult: string|null;
    private finishHandler: (test: BenchmarkTest) => void;
    constructor(group: string, onFinish: (test: BenchmarkTest) => void) {
        this.group = group;
        this.endState = null
        this.beginTime = Date.now();
        this.errorResult = null;
        this.finishHandler = onFinish;
    }
    success(): void {
        this.endState = BenchmarkTestEndState.Success;
        this.endTime = Date.now();
        this.finishHandler(this);
    }
    error(reason: string|Object): void {
        this.endState = BenchmarkTestEndState.Error;
        this.errorResult = typeof reason === "string" ? reason : serializeObject(reason);
        this.endTime = Date.now();
        this.finishHandler(this);
    }
}

enum BenchmarkState {
    Running = 1,
    Finishing = 2,
}

export type BenchmarkTestResult = {
    group: string;
    endState: BenchmarkTestEndState;
    duration: number;
    beginTime: number;
    endTime: number;
    errorResult: string;
};

export class Benchmark {
    readonly requestNum: number;
    readonly workerId: number;
    readonly workers: {workerId: number, requestNum: number}[];
    private state: BenchmarkState;
    private tests: BenchmarkTest[];
    private finishedTestResults: BenchmarkTestResult[];

    constructor(requestNum: number, workerId: number, workers: {workerId: number, requestNum: number}[]) {
        this.requestNum = requestNum;
        this.state = BenchmarkState.Running;
        this.workerId = workerId;
        this.workers = workers;
        this.tests = [];
        this.finishedTestResults = [];
    }

    get running(): boolean {
        return this.state === BenchmarkState.Running;
    }

    test(group: string): BenchmarkTest {
        const test = new BenchmarkTest(group, this.onTestFinish.bind(this));
        this.tests.push(test);
        return test;
    }

    requestFinish(): void {
        if (this.state !== BenchmarkState.Running) {
            return;
        }
        this.state = BenchmarkState.Finishing;
    }

    fetchFinishedTests(): BenchmarkTestResult[] {
        const results = this.finishedTestResults;
        this.finishedTestResults = [];
        return results;
    }

    private onTestFinish(test: BenchmarkTest): void {
        const index = this.tests.indexOf(test);
        if (index === -1 || test.endState == null) {
            throw new Error("invalid test");
        }
        this.tests.splice(index, 1);
        this.finishedTestResults.push({
            group: test.group,
            endState: test.endState,
            errorResult: test.errorResult || "",
            duration: test.endTime - test.beginTime,
            endTime: test.endTime,
            beginTime: test.beginTime
        });
    }
}

export interface BenchmarkDefine {
    config: BenchmarkConfig,
    task: (benchmark: Benchmark) => Promise<void>
}

let benchmarkDefine: BenchmarkDefine|undefined;

export default function defineBenchmark(config: BenchmarkConfig, task: (benchmark: Benchmark) => Promise<void>) {
    benchmarkDefine = {config, task};
}

export function getBenchmarkDefine(): BenchmarkDefine|undefined {
    return benchmarkDefine;
}
