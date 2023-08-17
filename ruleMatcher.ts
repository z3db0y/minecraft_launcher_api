import { version } from "os";
import { Rule } from "api/types/versionmeta";

export default function match(rule: Rule, features?: string[] | '*') {
    features = features || [];
    if(!rule.features && !rule.os) return true;
    if(rule.features && features !== '*') {
        let keys = Object.keys(rule.features);
        for(let i = 0; i < keys.length; i++) {
            let feature = keys[i];
            let mustBePresent = rule.features[feature];
            if(
                (!mustBePresent && features.includes(feature)) ||
                (mustBePresent && !features.includes(feature))
            ) return false;
        }
    }

    let arch = ['ia32', 'arm'].includes(process.arch) ? 'x86' : 'x64';
    let os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : process.platform === 'linux' ? 'linux' : 'unknown';
    if(rule.os && (
        (rule.os.name && rule.os.name !== os) ||
        (rule.os.arch && rule.os.arch !== arch) ||
        (rule.os.version && !new RegExp(rule.os.version, 'g').test(version()))
    )) return false;

    return true;
}