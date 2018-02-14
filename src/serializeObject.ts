export default function serializeObject(obj: any): string {
    const s: any = {};
    Object.getOwnPropertyNames(obj).forEach(key => {
        s[key] = obj[key];
    });
    return JSON.stringify(s);
}
