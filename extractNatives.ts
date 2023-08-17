import { existsSync, mkdirSync } from "fs";
import AdmZIP from "adm-zip";
import { join } from "path";
import { VersionMeta } from "./types/versionmeta";

export default function extractNatives(meta: VersionMeta, root: string, out: string) {
    if(!existsSync(join(root, out))) mkdirSync(join(root, out), { recursive: true });
    for(let i = 0; i < meta.libraries.length; i++) {
        let lib = meta.libraries[i];
        let os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'os' : process.platform === 'linux' ? 'linux' : 'unknown';
        let arch = ['arm', 'ia32'].includes(process.arch) ? '32' : '64';
        
        let nativePath: string;
        let zip: AdmZIP;

        if(lib.downloads.classifiers && lib.downloads.classifiers[lib.natives[os].format({ arch })]) {
            nativePath = join(root, 'libraries', lib.downloads.classifiers[lib.natives[os].format({ arch })].path);
            zip = new AdmZIP(nativePath);
            zip.extractAllTo(join(root, out));
        }

        if(lib.name.endsWith('natives-' + os) || lib.name.endsWith('natives-' + os + '-' + process.platform === 'win32' ? process.arch == 'ia32' ? 'x86' : 'x64' : process.arch)) {
            nativePath = join(root, 'libraries', lib.downloads.artifact.path);
            zip = new AdmZIP(nativePath);
            zip.extractAllTo(join(root, out));
        }
    }
}