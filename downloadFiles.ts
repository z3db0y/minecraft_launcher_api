import fetch from "./fetch";
import { createWriteStream, existsSync, mkdirSync } from "fs";
import { IncomingMessage } from "http";
import { basename, dirname, join } from "path";
import EventEmitter from "events";

export class DownloadProgress extends EventEmitter {
    size: number;
    received: number;
    percentage: number;
    done: boolean;
    
    constructor(response: IncomingMessage) {
        super();

        this.size = parseFloat(response.headers["content-length"]) || 0;
        
        let bytes = 0;
        let prevBytes = 0;
        let updateStats = () => {
            this.received = bytes;
            this.percentage = this.received / this.size * 100;
            this.emit('update', this.received - prevBytes);
            prevBytes = this.received;
        };

        response.on('data', chunk => {
            bytes += chunk.length;
            updateStats();
        });
        response.on('end', () => {
            this.done = true;
            this.emit('done');
        });
    }
}

export class OverallProgress extends EventEmitter {
    failed: number = 0;
    done: number = 0;
    total: number;
    progresses: DownloadProgress[] = [];
    totalSize: number = 0;
    downloaded: number = 0;

    constructor(promises: Promise<DownloadProgress>[]) {
        super();
        this.total = promises.length;

        for(let i = 0; i < promises.length; i++) {
            promises[i].then(downloader => {
                this.progresses.push(downloader);
                downloader.on('done', () => {
                    this.done++;
                    if(this.done + this.failed === this.total) this.emit('done');
                });
                this.totalSize += downloader.size;
                downloader.on('update', chunkSize => {
                    this.downloaded += chunkSize;
                    this.emit('update');
                });
                
                this.emit('update');
            }).catch(() => this.failed++);
        }
    }
}

interface File {
    url: string;
    path?: string;
}

export default function downloadFiles(files: (string | File)[], root: string) {
    if(!existsSync(root)) mkdirSync(root, { recursive: true });

    let promises = [];
    for(let i = 0; i < files.length; i++) {
        promises.push(new Promise(async (resolve, reject) => {
            let file = files[i];
            let response = await fetch(typeof file === 'string' ? file : file.url).catch(reject);
            if(!response) return;
            let dir = dirname(join(root, typeof file === 'string' ? basename(file) : file.path || basename(file.url)));
            if(!existsSync(dir)) mkdirSync(dir, { recursive: true });
            let fileStream = createWriteStream(join(root, typeof file === 'string' ? basename(file) : file.path || basename(file.url)));
            response.pipe(fileStream);
            let progress = new DownloadProgress(response);

            resolve(progress);
        }))
    }

    return (new OverallProgress(promises));
}