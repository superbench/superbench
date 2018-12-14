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
    title: "no suucess and no error",
    description: "sucess() and error() are not called",
    concurrentRequestNum: 1,
    measurementInterval: 10,
    duration: 60
}, async benchmark => {
    const tasks= [];
    for (let i = 0; i < benchmark.requestNum; i++) {
        tasks.push(new Promise(async resolve => {
            while (benchmark.running) {
                const t1 = benchmark.test("test1");
                await wait(333);
            }
            resolve();
        }));
    }
    await Promise.all(tasks);
});
