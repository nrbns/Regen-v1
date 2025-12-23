import { describe, expect, it } from 'vitest';
import { toolRegistryV2 } from '../tools/v2';

const tool = toolRegistryV2.get('extract_table');
if (!tool) {
  throw new Error('extract_table tool missing');
}

const memoryStub = {
  get: () => null,
  set: () => {},
  remember: () => {},
};

describe('extract_table tool', () => {
  it('extracts headers and rows from html', async () => {
    const html = `
      <table>
        <tr><th>Name</th><th>Role</th></tr>
        <tr><td>Ada</td><td>Researcher</td></tr>
        <tr><td>Tesla</td><td>Engineer</td></tr>
      </table>
    `;

    const result = (await tool.run(
      { html, tableIndex: 0 },
      { planId: 'p', nodeId: 'n', previousResults: new Map(), memory: memoryStub }
    )) as any;
    expect(result.headers).toEqual(['Name', 'Role']);
    expect(result.table).toEqual([
      ['Ada', 'Researcher'],
      ['Tesla', 'Engineer'],
    ]);
  });

  it('throws when no table found', async () => {
    await expect(
      tool.run(
        { html: '<div>No table</div>', tableIndex: 0 },
        { planId: 'p', nodeId: 'n', previousResults: new Map(), memory: memoryStub }
      )
    ).rejects.toThrow('No table');
  });
});
