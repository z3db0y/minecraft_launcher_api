import "./extendString";
import fetch from "./fetch";
import consts from "../../consts.json";
import { Artifact, AssetInfo, VersionList, VersionMeta } from "api/types/versionmeta";
import parseMeta from "./parseMeta";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import downloadFiles, { OverallProgress } from "./downloadFiles";
import { createHash } from "crypto";

async function downloadAndParseMeta(version: string): Promise<VersionMeta | void> {
    let versionListResponse = await fetch(consts.ENDP.VERSIONS).catch(_ => {});
    if(!versionListResponse) return;
    let versionList = await new Promise<VersionList>((resolve, reject) => {
        if(!versionListResponse) return;
        let body = '';
        versionListResponse.on('data', chunk => body += chunk);
        versionListResponse.on('end', () => {
            try { resolve(JSON.parse(body)) }
            catch { reject() }
        });
    }).catch(_ => {});
    if(!versionList) return;
    let versionURL = versionList.versions.find(x => x.id === version)?.url;
    if(!versionURL) return;
    
    let versionMetaResponse = await fetch(versionURL).catch(_ => {});
    if(!versionMetaResponse) return;
    let versionMeta = await new Promise<VersionMeta>((resolve, reject) => {
        if(!versionMetaResponse) return;
        let body = '';
        versionMetaResponse.on('data', chunk => body += chunk);
        versionMetaResponse.on('end', () => {
            try { resolve(JSON.parse(body)) }
            catch { reject() }
        });
    }).catch(_ => {});
    if(!versionMeta) return;

    return parseMeta(versionMeta);
}

async function downloadAssets(assetInfoURL: string, assetRoot: string, index: string): Promise<void | OverallProgress> {
    let assetInfoResponse = await fetch(assetInfoURL).catch(_ => {});
    let assetInfo = await new Promise<AssetInfo>((resolve, reject) => {
        if(!assetInfoResponse) return;
        let body = '';
        assetInfoResponse.on('data', chunk => body += chunk);
        assetInfoResponse.on('end', () => {
            try { resolve(JSON.parse(body)) }
            catch { reject() }
        });
    }).catch(_ => {});
    if(!assetInfo) return;

    writeFileSync(join(assetRoot, 'indexes', index + '.json'), JSON.stringify(assetInfo));

    let assets = Object.values(assetInfo.objects);
    let filtered = [];
    for(let i = 0; i < assets.length; i++) {
        let assetPath = join(assetRoot, 'objects', `${assets[i].hash.slice(0, 2)}/${assets[i].hash}`);
        if(
            !existsSync(assetPath) ||
            createHash('sha1').update(readFileSync(assetPath)).digest('hex') !== assets[i].hash
        ) filtered.push(assets[i]);
    }

    return downloadFiles(filtered.map(x => { return {
        url: consts.ENDP.ASSETS.format({
            hash: x.hash,
            hashStart: x.hash.slice(0, 2)
        }),
        path: `${x.hash.slice(0, 2)}/${x.hash}`
    }}), join(assetRoot, 'objects'));
}

export default async function preLaunchFlow(version: string, root: string) {
    let meta: void | VersionMeta;

    if(existsSync(join(root, 'versions', version, version + '.json'))) {
        try { meta = JSON.parse(readFileSync(join(root, 'versions', version, version + '.json'), 'utf8')) }
        catch { meta = await downloadAndParseMeta(version); }
    } else meta = await downloadAndParseMeta(version);

    if(!meta) throw 'Failed to get version metadata for version ' + version;

    if(!existsSync(join(root, 'versions', version))) mkdirSync(join(root, 'versions', version), { recursive: true });
    if(!existsSync(join(root, 'assets/objects'))) mkdirSync(join(root, 'assets/objects'), { recursive: true });
    if(!existsSync(join(root, 'assets/indexes'))) mkdirSync(join(root, 'assets/indexes'), { recursive: true });
    if(!existsSync(join(root, 'libraries'))) mkdirSync(join(root, 'libraries'), { recursive: true });
    writeFileSync(join(root, 'versions', version, version + '.json'), JSON.stringify(meta));

    let assetDownloader = await downloadAssets(meta.assetIndex.url, join(root, 'assets'), meta.assetIndex.id);
    if(!assetDownloader) throw 'Failed to download assets for version ' + version;

    let needClientRedownload = !existsSync(join(root, 'versions', version, version + '.jar')) || createHash('sha1').update(readFileSync(join(root, 'versions', version, version + '.jar'))).digest('hex') !== meta.downloads.client.sha1;
    let clientDownloader: OverallProgress;

    if(needClientRedownload) {
        clientDownloader = downloadFiles([{
            url: meta.downloads.client.url,
            path: version + '.jar'
        }], join(root, 'versions', version));
    }

    let filteredLibraries: Artifact[] = [];
    let os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : process.platform === 'linux' ? 'linux' : 'unknown';
    let arch = ['arm', 'ia32'].includes(process.arch) ? '32' : '64';
    for(let i = 0; i < meta.libraries.length; i++) {
        let library = meta.libraries[i];
        if(
            library.downloads.artifact &&
            (!existsSync(join(root, 'libraries', library.downloads.artifact.path)) ||
            createHash('sha1').update(readFileSync(join(root, 'libraries', library.downloads.artifact.path))).digest('hex') !== library.downloads.artifact.sha1)
        ) filteredLibraries.push(library.downloads.artifact);

        if(
            library.downloads.classifiers && library.downloads.classifiers[library.natives[os].format({ arch })] &&
            (!existsSync(join(root, 'libraries', library.downloads.classifiers[library.natives[os].format({ arch })].path)) ||
            createHash('sha1').update(readFileSync(join(root, 'libraries', library.downloads.classifiers[library.natives[os].format({ arch })].path))).digest('hex') !== library.downloads.classifiers[library.natives[os].format({ arch })].sha1)
        ) filteredLibraries.push(library.downloads.classifiers[library.natives[os].format({ arch })]);
    }

    let libraryDownloader = downloadFiles(filteredLibraries.map(x => { return {
        url: x.url,
        path: x.path
    } }), join(root, 'libraries'));

    return {
        assetDownloader,
        clientDownloader,
        libraryDownloader,
        meta
    };
}