// We don't use callback functions for performance improvement as much as possible.

namespace MathUtils {
    export function sum(nums: number[]): number {
        let sum = 0;
        for (let i = 0; i < nums.length; i++) {
            sum += nums[i];
        };
        return sum;
    };

    export function average(nums: number[]): number {
        const s = sum(nums);
        return s / nums.length;
    }

    export function median(nums: number[]): number {
        const arr = nums.slice(0);
        arr.sort((a, b) => {
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        });
        const mid = Math.floor(arr.length / 2);
        if (arr.length % 2 == 1) {
            return arr[mid];
        } else {
            return (arr[mid - 1] + arr[mid]) / 2;
        }
    }

    export function max(nums: number[]): number {
        // NOTE: Do not use Math.max(...nums) because `Maximum call stack size exceeded` error occurred when nums are large array.
        let m = nums[0];
        if (nums.length === 1) {
            return m;
        }
        for (let i = 1; i < nums.length; i++) {
            if (nums[i] > m) {
                m = nums[i];
            }
        }
        return m;
    }

    export function min(nums: number[]): number {
        // NOTE: Do not use Math.min(...nums) because `Maximum call stack size exceeded` error occurred when nums are large array.
        let m = nums[0];
        if (nums.length === 1) {
            return m;
        }
        for (let i = 1; i < nums.length; i++) {
            if (nums[i] < m) {
                m = nums[i];
            }
        }
        return m;
    }
}

export default MathUtils;
