import * as cluster from "cluster";
import {BenchmarkDefine, BenchmarkTestResult} from "./Benchmark";
import Worker from "./Worker";
import Report, {Aggregator} from "./Report";
import ConsoleView from "./ConsoleView";
import Slave from "./Slave";
import WorkerManager from "./WorkerManager";
import ValidationInfo from "./ValidationInfo";

const AGGREGATE_INTERVAL = 1000;

export type SlaveServerAddess = string;

export default class MasterRunner {
    private workers: Worker[];
    private benchmarkDefine: BenchmarkDefine;
    private slaves: Slave[];
    private startedAt: Date;
    private workerManager: WorkerManager;
    private measurementIntervalTimer: NodeJS.Timer;
    private benchmarkTimer: NodeJS.Timer;
    private aggregateTimer: NodeJS.Timer;
    private aggregator: Aggregator;
    private beforeReportTime: number;
    private beforeReportOffset: number;
    private beforeReportElapsed: number;
    private consoleView: ConsoleView;
    private validationInfo: ValidationInfo;
    constructor(params: {
        clusterWorkers: cluster.Worker[],
        benchmarkDefine: BenchmarkDefine,
        slaves: SlaveServerAddess[],
        consoleView: ConsoleView,
        validationInfo: ValidationInfo
    }) {
        this.benchmarkDefine = params.benchmarkDefine;
        this.slaves = params.slaves.map(addr => new Slave(addr));
        this.workers = params.clusterWorkers.map(clusterWorker => new Worker(clusterWorker));
        this.beforeReportOffset = 0
        this.beforeReportTime = 0;
        this.beforeReportElapsed = 0;
        this.consoleView = params.consoleView;
        this.validationInfo = params.validationInfo;
    }
    async start(): Promise<void> {
        this.consoleView.showBenchmarkInfo();
        const durationSec = this.benchmarkDefine.config.duration;

        if (this.slaves.length) {
            await Promise.all(this.slaves.map(s => s.open()));
            const vlist = await Promise.all(this.slaves.map(s => s.getValidationInfo()));
            vlist.forEach((vi, i) => {
                if (!(vi.appVersion === this.validationInfo.appVersion
                      && vi.benchmarkDefineFileHash === this.validationInfo.benchmarkDefineFileHash)) {
                    throw new Error(`superbench version or define file on slave ${this.slaves[i].addr} is not same as master.`);
                }
            });
        }

        const concurrentRequestNum = this.benchmarkDefine.config.concurrentRequestNum;
        this.workerManager = new WorkerManager(this.workers, this.slaves);
        const assignedWorkerNum = await this.workerManager.assign(concurrentRequestNum);

        this.startedAt = new Date();
        this.aggregator = new Aggregator();
        return new Promise<void>(async (resolve, reject) => {
            let finishedWorkerCount = 0;
            this.workerManager.on("error", reject);
            this.workerManager.on("finished", async (results: BenchmarkTestResult[]) => {
                finishedWorkerCount++;
                this.aggregator.addResults(results);
                if (finishedWorkerCount === assignedWorkerNum) {
                    clearTimeout(this.benchmarkTimer);
                    clearTimeout(this.measurementIntervalTimer);
                    clearTimeout(this.aggregateTimer);
                    const finished = new Date();
                    const report = new Report(
                        this.benchmarkDefine.config,
                        this.aggregator,
                        this.startedAt,
                        finished,
                        assignedWorkerNum
                    );
                    this.consoleView.showResults(report.serialize());
                    this.slaves.forEach(s => s.stop());
                    resolve();
                }

            });
            this.benchmarkTimer = setTimeout(async () => {
                try {
                    await this.workerManager.finish();
                } catch(e) {
                    reject(e);
                }
            }, durationSec * 1000);
            try {
                await this.workerManager.start();
                this.startAggregateTimer();
                this.startReportTimer();
            } catch(e) {
                reject(e);
            }
        });
    }
    private startReportTimer(): void {
        const measurementIntervalSec = this.benchmarkDefine.config.measurementInterval;
        if (!this.beforeReportTime) {
            this.beforeReportTime = Date.now();
        }
        this.measurementIntervalTimer = setTimeout(() => {
            const now = Date.now();
            const interval = now - this.beforeReportTime;
            const result = this.aggregator.aggregate(interval, this.beforeReportOffset);
            const elapsed = this.beforeReportElapsed + interval;
            this.consoleView.showProgress(Math.round(elapsed / 1000), result.stats);
            this.beforeReportElapsed = elapsed;
            if (result) {
                this.beforeReportTime = now;
                this.beforeReportOffset += result.testCount;
            }
            this.startReportTimer();
        }, measurementIntervalSec * 1000);
    }
    private startAggregateTimer(): void {
        this.aggregateTimer = setTimeout(async () => {
            try {
                const results = await this.workerManager.fetchTestResults();
                this.aggregator.addResults(results);
                this.startAggregateTimer();
            } catch(e) {
                console.error(e);
            }
        }, AGGREGATE_INTERVAL);
    }
}
