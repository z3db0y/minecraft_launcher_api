export {};
declare global {
    interface String {
        format: (vars: any) => string;
    }
}

String.prototype.format = function (this: String, vars: any) {
    return this.replaceAll(/\${([^}]*)}/g, (match, v) => {
        return vars[v] || '""';
    });
}