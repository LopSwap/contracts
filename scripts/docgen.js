import { promises as fs } from 'node:fs';
import path from 'node:path';

import { docgen } from 'solidity-docgen';

import { docgenConfig } from '../docgen.config.js';

const root = process.cwd();
const buildInfoDir = path.join(root, 'artifacts', 'build-info');

const buildInfoFiles = (await fs.readdir(buildInfoDir))
    .filter((file) => file.endsWith('.json') && !file.endsWith('.output.json'))
    .sort();

const builds = await Promise.all(
    buildInfoFiles.map(async (file) => {
        const buildInfo = JSON.parse(await fs.readFile(path.join(buildInfoDir, file), 'utf8'));
        const outputInfo = JSON.parse(await fs.readFile(path.join(buildInfoDir, file.replace('.json', '.output.json')), 'utf8'));

        return {
            input: buildInfo.input,
            output: outputInfo.output,
        };
    }),
);

await docgen(builds, {
    root,
    ...docgenConfig,
});
