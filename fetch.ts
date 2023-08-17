import http, { IncomingMessage } from 'http';
import https from 'https';

export default function fetch(url: string, options?: {
    headers?: any;
    method?: string;
    body?: any;
}) {
    let parsed  = new URL(url);
    return new Promise<IncomingMessage>((resolve, reject) => {
        let req = (parsed.protocol.endsWith('s:') ? https : http).request(url, {
            method: options?.method,
            headers: options?.headers
        }, res => resolve(res));
        
        req.on('error', reject);
    
        if(options?.body) req.write(options.body);
        req.end();
    });
}