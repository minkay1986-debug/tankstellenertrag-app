const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname, '..', '..');
const source = path.join(root, 'test-fixtures', 'huth');
const target = path.join(os.tmpdir(), 'tankstellenertrag-huth-fixtures');
fs.mkdirSync(target, { recursive: true });
for (const name of fs.readdirSync(source).filter((n) => n.endsWith('.pdf.b64')).sort()) {
  const pdfName = name.slice(0, -4);
  const bytes = Buffer.from(fs.readFileSync(path.join(source, name), 'utf8').trim(), 'base64');
  if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('Invalid PDF fixture: ' + name);
  fs.writeFileSync(path.join(target, pdfName), bytes);
  process.stdout.write(path.join(target, pdfName) + '\\n');
}
