# Minecraft Launcher API
- Takes care of downloading game files
- Easy to use

# Example
```typescript
import buildClassPath from "./api/buildClassPath";
import extractNatives from "./api/extractNatives";
import preLaunchFlow from "./api/preLaunchFlow";
import launch, { LaunchParams } from "./api/launcher";
import { join } from "path";

let rootDirectory = join((process.env.APPDATA || process.env.HOME), '.minecraft');
let version = '1.20.1';
let javaPath = '/usr/bin/java';

(async () => {
    let downloader = await preLaunchFlow(version, rootDirectory).catch(e => {
        console.log('Failed to launch Minecraft: ' + e);
    });
    if(!downloader) return;

    let downloadFailed = await new Promise(resolve => {
        let onDone = () => {
            let fullyDone = (downloader &&
                downloader.assetDownloader.total === downloader.assetDownloader.done + downloader.assetDownloader.failed &&
                downloader.libraryDownloader.total === downloader.libraryDownloader.done + downloader.libraryDownloader.failed &&
                (!downloader.clientDownloader || downloader.clientDownloader.total === downloader.clientDownloader.done + downloader.clientDownloader.failed));
            if(!fullyDone) return;

            if(!downloader) resolve('');
            else if(downloader.assetDownloader.total !== downloader.assetDownloader.done) resolve('assets');
            else if(downloader.libraryDownloader.total !== downloader.libraryDownloader.done) resolve('libraries');
            else if(downloader.clientDownloader && downloader.clientDownloader.total !== downloader.clientDownloader.done) resolve('client.jar');
            else resolve(false);
        };

        if(downloader && downloader.assetDownloader.total === downloader.assetDownloader.done + downloader.assetDownloader.failed) onDone();
        if(downloader && downloader.libraryDownloader.total === downloader.libraryDownloader.done + downloader.libraryDownloader.failed) onDone();
        if(downloader &&downloader.clientDownloader && downloader.clientDownloader.total === downloader.clientDownloader.done + downloader.clientDownloader.failed) onDone();
    
        if(downloader) downloader.assetDownloader.once('done', onDone);
        if(downloader) downloader.libraryDownloader.once('done', onDone);
        if(downloader && downloader.clientDownloader) downloader.clientDownloader.once('done', onDone);
    });

    if(typeof downloadFailed === 'string') return console.log('Failed to download ' + (downloadFailed || 'Minecraft') + '.');

    if(typeof downloadFailed === 'string') return console.log('Failed to download ' + (downloadFailed || 'Minecraft') + '.');

    let binDirectory = join(rootDirectory, 'bin', randomBytes(16).toString('hex'));
    extractNatives(downloader.meta, rootDirectory, binDirectory);

    let launchParams: LaunchParams = {
        assets_index_name: downloader.meta.assets,
        assets_root: join(rootDirectory, 'assets'),
        auth_player_name: args[1],
        auth_uuid: '0',
        classpath: buildClassPath(downloader.meta, rootDirectory),
        game_directory: rootDirectory,
        natives_directory: binDirectory,
        version_name: downloader.meta.id,
        version_type: downloader.meta.type
    };

    let game = launch(javaPath, downloader.meta, launchParams, []);
    game.stdout.on('data', d => console.log(d.toString()));
    game.stderr.on('data', d => console.log(d.toString()));
})();
```