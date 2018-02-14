import {EventEmitter} from "events";
import Worker from "./Worker";
import Slave from "./Slave";
import {BenchmarkTestResult} from "./Benchmark";

export default class WorkerManager extends EventEmitter {
    masterWorkers: Worker[];
    slaves: Slave[];
    assignedMasterWorkers: Worker[];
    assignedSlaves: Slave[];
    constructor(masterWorkers: Worker[], slaves: Slave[]) {
        super();
        this.masterWorkers = masterWorkers;
        this.slaves = slaves;
        this.assignedMasterWorkers = [];
        this.assignedSlaves = [];
    }
    async assign(concurrentRequestNum: number): Promise<number> {
        let totalWorkerNum = this.masterWorkers.length;
        if (this.slaves.length) {
            totalWorkerNum += this.slaves.map(s => s.workerNum).reduce((a, b) => a + b);
        }
        if (totalWorkerNum === 0) {
            throw new Error("worker is missing");
        }
        const requestNumsPerWorker = Array.from(Array(totalWorkerNum).keys()).map(d => Math.floor((concurrentRequestNum + d) / totalWorkerNum)).filter(n => n > 0);
        let nextWorkerId = 1;
        const workers = requestNumsPerWorker.map(requestNum => ({workerId: nextWorkerId++, requestNum}));
        const acceptableWorkerNums = [this.masterWorkers.length].concat(this.slaves.map(s => s.workerNum));
        const assignTasks: Promise<void>[] = [];
        let offset = 0;
        for (let i = 0; i < acceptableWorkerNums.length; i++) {
            const assignWorkers = workers.slice(offset, offset + acceptableWorkerNums[i]).map(w => Object.assign({}, w, {workers}));
            if (i === 0) {
                assignWorkers.forEach((aw, i) => {
                    assignTasks.push(this.masterWorkers[i].assign(aw));
                    this.assignedMasterWorkers.push(this.masterWorkers[i]);
                });
            } else {
                const slave = this.slaves[i - 1];
                assignTasks.push(slave.assignWorkers(assignWorkers));
                this.assignedSlaves.push(slave);
            }
            offset += acceptableWorkerNums[i];
            if (offset > workers.length) {
                break;
            }
        }
        await Promise.all(assignTasks);
        return requestNumsPerWorker.length;
    }
    async start(): Promise<void> {
        this.assignedMasterWorkers.forEach(w => {
            w.handleFinished().then(result => {
                this.emit("finished", result);
            }).catch(e => {
                this.emit("error", e);
            });
        });
        this.assignedSlaves.forEach(s => {
            s.assignedWorkerIds.forEach(id => {
                s.handleFinished(id).then(result => {
                    this.emit("finished", result);
                }).catch(e => {
                    this.emit("error", e);
                });
            });
        });
        await Promise.all(this.assignedMasterWorkers
                          .map(w => w.start())
                          .concat(this.assignedSlaves.map(s => s.start())));
    }
    async finish(): Promise<void> {
        await Promise.all(this.assignedMasterWorkers
                          .map(w => w.finish())
                          .concat(this.assignedSlaves.map(s => s.finish())));
    }
    async fetchTestResults(): Promise<BenchmarkTestResult[]> {
        const results = await Promise.all(this.assignedMasterWorkers
                                          .map(w => w.fetchTestResults())
                                          .concat(this.assignedSlaves.map(s => s.fetchTestResults())));
        let ret: BenchmarkTestResult[] = [];
        results.forEach(result => ret = ret.concat(result));
        return ret;
    }
}
