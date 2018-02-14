const defineBenchmark = require("../lib").default;

async function wait(ms) {
    var s = Date.now();
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}

defineBenchmark({
    title: "3rps",
    description: "test define file",
    concurrentRequestNum: 1,
    measurementInterval: 10,
    duration: 60
}, async benchmark => {
    const tasks= [];
    for (let i = 0; i < benchmark.requestNum; i++) {
        tasks.push(new Promise(async resolve => {
            while (benchmark.running) {
                const t1 = benchmark.test("test1");
                try {
                    await wait(333);
                    t1.success();
                } catch (e) {
                    t1.error(e);
                }
            }
            resolve();
        }));
    }
    await Promise.all(tasks);
});
