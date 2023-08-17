import { join } from "path";
import { VersionMeta } from "./types/versionmeta";

export default function buildClassPath(meta: VersionMeta, root: string) {
    let delim = (process.platform === 'win32' ? ';' : ':');
    let classPath = join(root, 'versions', meta.id, meta.id + '.jar') + delim;
    for(let i = 0; i < meta.libraries.length; i++) {
        let artifact = meta.libraries[i].downloads.artifact;
        if(!artifact) continue;
        classPath += join(root, 'libraries', artifact.path) + delim;
    }

    return classPath;
}