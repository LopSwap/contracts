import { oneInchTemplates } from '@1inch/solidity-utils/docgen';

export const docgenConfig = {
    sourcesDir: 'project/contracts',
    outputDir: 'docs',
    templates: oneInchTemplates(),
    pages: 'files',
    exclude: ['mocks', 'tests'],
};
