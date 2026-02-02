import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

const urls = [
    "https://unpkg.com/roboto-fontface@0.8.0/fonts/roboto/Roboto-Regular.ttf",
    "https://cdn.jsdelivr.net/npm/roboto-fontface@0.8.0/fonts/roboto/Roboto-Regular.ttf"
];

const destination = path.resolve('public/fonts/Roboto-Regular.ttf');

async function downloadFont() {
    for (const url of urls) {
        console.log(`Trying to download from: ${url}`);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.log(`Failed ${response.status} ${response.statusText}`);
                continue;
            }

            const fileStream = fs.createWriteStream(destination, { flags: 'w' });
            if (response.body) {
                await finished(Readable.fromWeb(response.body).pipe(fileStream));
                console.log('Download Completed Successfully!');
                return;
            }
        } catch (error) {
            console.error(`Error with ${url}:`, error.message);
        }
    }
    console.error("All download attempts failed.");
    process.exit(1);
}

downloadFont();
