type InvoicePdfInput = {
  invoiceNumber: string;
  publicId: string;
  status: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  lineItems: Array<{
    code: string;
    description: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
  }>;
};

function escapePdfText(text: string) {
  return text.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

function textLines(lines: string[]) {
  const commands: string[] = ['BT', '/F1 12 Tf', '50 800 Td'];
  lines.forEach((line, index) => {
    const escaped = escapePdfText(line);
    if (index === 0) {
      commands.push(`(${escaped}) Tj`);
    } else {
      commands.push('T*');
      commands.push(`(${escaped}) Tj`);
    }
  });
  commands.push('ET');
  return commands.join('\n');
}

function buildPdfObjects(content: string) {
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${Buffer.byteLength(content, 'utf8')} >> stream\n${content}\nendstream endobj`,
  ];

  const header = '%PDF-1.4\n';
  let offset = Buffer.byteLength(header, 'utf8');
  const offsets = ['0000000000 65535 f '];
  const body = objects.map((object) => {
    offsets.push(`${String(offset).padStart(10, '0')} 00000 n `);
    offset += Buffer.byteLength(`${object}\n`, 'utf8');
    return `${object}\n`;
  });

  const xrefStart = offset + Buffer.byteLength(body.join(''), 'utf8');
  const xref = [
    'xref',
    `0 ${offsets.length}`,
    ...offsets,
    'trailer << /Size 6 /Root 1 0 R >>',
    'startxref',
    String(xrefStart),
    '%%EOF',
  ].join('\n');

  return Buffer.from(`${header}${body.join('')} ${xref}`.replace(' \n', '\n'), 'utf8');
}

export function generateInvoicePdfBuffer(invoice: InvoicePdfInput) {
  const lines = [
    `Invoice ${invoice.invoiceNumber}`,
    `Reference ${invoice.publicId}`,
    `Status ${invoice.status}`,
    `Currency ${invoice.currency}`,
    `Subtotal ${invoice.subtotal}`,
    `Tax ${invoice.tax}`,
    `Total ${invoice.total}`,
    '',
    'Line Items',
    ...invoice.lineItems.map((item) => `${item.code} | ${item.description} | ${item.quantity} x ${item.unitAmount} = ${item.totalAmount}`),
  ];

  return buildPdfObjects(textLines(lines));
}
