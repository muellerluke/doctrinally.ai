// Generates sample.pdf and sample.docx. Run once:
//   node tests/fixtures/build-fixtures.mjs
//
// The fixtures are checked into the repo so CI doesn't need to regenerate
// them; this script exists so we can rebuild them if they ever change.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// ─── Minimal valid PDF ───────────────────────────────────────────────
// Generates a single-page PDF with a paragraph of body text. unpdf can
// extract text from this.
function makePdf(text) {
  const content = `BT /F1 12 Tf 50 750 Td (${text}) Tj ET`;
  const stream = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    stream,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xrefStart = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    out += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(out, "binary");
}

// ─── Minimal valid .docx (Open XML / ZIP bundle) ────────────────────
// Rather than hand-roll the ZIP, use the `node-stream-zip` alternative:
// we'll produce a tiny in-memory ZIP via Node's built-in zlib.
import { createWriteStream } from "node:fs";
import zlib from "node:zlib";

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function zipEntry(name, data) {
  const nameBuf = Buffer.from(name);
  const rawCrc = crc32(data);
  const compressed = zlib.deflateRawSync(data);
  return {
    name: nameBuf,
    compressed,
    uncompressedSize: data.length,
    compressedSize: compressed.length,
    crc: rawCrc,
  };
}

function buildZip(entries) {
  const chunks = [];
  const localHeaders = [];
  let offset = 0;

  for (const e of entries) {
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version
    localHeader.writeUInt16LE(0, 6);  // flags
    localHeader.writeUInt16LE(8, 8);  // deflate
    localHeader.writeUInt16LE(0, 10); // time
    localHeader.writeUInt16LE(0x21, 12); // date
    localHeader.writeUInt32LE(e.crc, 14);
    localHeader.writeUInt32LE(e.compressedSize, 18);
    localHeader.writeUInt32LE(e.uncompressedSize, 22);
    localHeader.writeUInt16LE(e.name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    chunks.push(localHeader, e.name, e.compressed);
    localHeaders.push({ entry: e, offset });
    offset += 30 + e.name.length + e.compressed.length;
  }

  const cdStart = offset;
  for (const { entry: e, offset: off } of localHeaders) {
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0x21, 14);
    cd.writeUInt32LE(e.crc, 16);
    cd.writeUInt32LE(e.compressedSize, 20);
    cd.writeUInt32LE(e.uncompressedSize, 24);
    cd.writeUInt16LE(e.name.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(off, 42);
    chunks.push(cd, e.name);
    offset += 46 + e.name.length;
  }
  const cdEnd = offset;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(localHeaders.length, 8);
  eocd.writeUInt16LE(localHeaders.length, 10);
  eocd.writeUInt32LE(cdEnd - cdStart, 12);
  eocd.writeUInt32LE(cdStart, 16);
  eocd.writeUInt16LE(0, 20);
  chunks.push(eocd);

  return Buffer.concat(chunks);
}

function makeDocx(text) {
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${text}</w:t></w:r></w:p>
  </w:body>
</w:document>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  return buildZip([
    zipEntry("[Content_Types].xml", Buffer.from(contentTypes)),
    zipEntry("_rels/.rels", Buffer.from(rels)),
    zipEntry("word/document.xml", Buffer.from(doc)),
  ]);
}

// Write fixtures
const pdfText = "Introduction. This is a sample sermon document. We discuss faith and hope across multiple sentences. Scripture reminds us of God's promises. Let us pray.";
fs.writeFileSync(path.join(here, "sample.pdf"), makePdf(pdfText));
fs.writeFileSync(path.join(here, "sample.docx"), makeDocx(pdfText));
console.log("Wrote sample.pdf and sample.docx");
