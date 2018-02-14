# superbench

superbench is a lightweight load testing framework for Node.js. superbench focuses on a distributed execution and an aggregation. A test scenario is written in JavaScript code. superbench doesn't depend on any API clients. So, you can test any servers with the clients.

## Installing

```bash
npm install -g superbench
```

## Usage

### Create your test scenario file

```js
import defineBenchmark from "superbench";

defineBenchmark({
    title: "someAPI",
    description: "check some API",
    concurrentRequestNum: 10,
    measurementInterval: 30,  // sec
    duration: 180 // sec
}, async benchmark => {
    // You need write a scenario code for parallelization that is run in a worker.
    const tasks = [];
    // superbench calculates request num of this worker.
    // You can get it from `benchmark.requestNum`.
    for (let i = 0; i < benchmark.requestNum; i++) {
        tasks.push(new Promise(async resolve => {
            // If you run loop processing, you need to check `benchmark.running`.
            while (benchmark.running) {
                const t1 = benchmark.test("healthcheck1");
                try {
                    await yourAPIClient.callSomeAPI();
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

```

### Standalone

```
superbench start path/to/benchmarkDefineFile.js
```

### Master/Slave

superbench supports master/slave clustering mode.
It helps you to distribute the load of client efficiently

1. Run slave in slave host

```
superbench slave path/to/benchmarkDefineFile.js
```

2. Run master in master host

```
superbench start path/to/benchmarkDefineFile.js -s slave-host:8080
```

## Reporting

### Standard output

```
==================================================================================
title: someAPI
description: check some API
benchmark define file: path/to/benchmarkDefineFile.js
duration(sec): 180
measurement interval(sec): 30
==================================================================================
                                    [ Progress ]
elapsed   req       rps       avg       min       max       median    error(%)
30s       1890      62.99     153.44ms  150ms     157ms     154ms     96(5.08)
60s       1972      65.71     152.96ms  149ms     158ms     153ms     110(5.58)
90s       1968      65.59     152.88ms  149ms     157ms     153ms     101(5.13)
120s      1970      65.64     153.17ms  149ms     160ms     153.5ms   92(4.67)
150s      1965      65.48     153.43ms  149ms     159ms     154ms     108(5.5)
180s      1965      65.48     153.4ms   149ms     156ms     154ms     95(4.83)
==================================================================================
                                  [ Group Result ]
group               req       avg       min       max       median    error(%)
healthcheck1        11730     153.21ms  149ms     160ms     154ms     602(5.13)
==================================================================================
                                     [ Errors ]
602 errors are found.
...
==================================================================================
                                  [ Global Result ]
started             Wed Feb 14 2018 03:29:36 GMT+0900 (JST)
finished            Wed Feb 14 2018 03:32:36 GMT+0900 (JST)
worker              4
duration            180077ms
requests            11730
rps                 65.14
avg                 153.21ms
min                 149ms
max                 160ms
median              154ms
success(%)          11128(94.87)
error(%)            602(5.13)
```

### File output

It will be added in the near future version.

### Report Plugin

It will be added in the near future version.

## Building

```bash
git clone https://github.com/superbench/superbench.git
cd superbench
npm install
npm run build
```

## Contribution

1. Fork it ( http://github.com/superbench/superbench )
2. Create your feature branch (git checkout -b my-new-feature)
3. Commit your changes (git commit -am 'Add some feature')
4. Push to the branch (git push origin my-new-feature)
5. Create new Pull Request

## LICENSE

MIT
