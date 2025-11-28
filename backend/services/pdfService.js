/**
 * PDF Service
 * Generates PDF documents for purchase requests, quotation requests, orders, etc.
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate a PDF for a quotation request (RFQ)
 * @param {Object} request - Purchase request data
 * @param {Array} suppliers - List of suppliers to send RFQ to
 * @param {string} deadline - Deadline for quotations
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateRFQPDF(request, suppliers, deadline) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 80, left: 50, right: 50 }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Register a font that supports Spanish characters
      doc.registerFont('Helvetica', 'Helvetica');

      // Header
      doc.fontSize(20).font('Helvetica-Bold')
        .text('SOLICITUD DE COTIZACION', { align: 'center' });

      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica')
        .text(`RFQ-${new Date().getFullYear()}-${String(request.id).padStart(4, '0')}`, { align: 'center' });

      doc.moveDown(2);

      // Request Information
      doc.fontSize(14).font('Helvetica-Bold')
        .text('Informacion de la Solicitud');

      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');

      doc.text(`Numero de Solicitud: ${request.request_number}`, { continued: false });
      doc.text(`Titulo: ${request.title}`);
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`);
      doc.text(`Fecha limite para cotizaciones: ${new Date(deadline).toLocaleDateString('es-AR')}`);

      if (request.category) {
        doc.text(`Categoria: ${request.category.name}`);
      }

      doc.moveDown(1);

      // Description
      if (request.description) {
        doc.fontSize(14).font('Helvetica-Bold')
          .text('Descripcion');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica')
          .text(request.description, { align: 'justify' });
        doc.moveDown(1);
      }

      // Items
      if (request.items && request.items.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold')
          .text('Items Solicitados');
        doc.moveDown(0.5);

        // Table header
        const tableTop = doc.y;
        const col1X = 50;
        const col2X = 380;
        const col3X = 480;

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Descripcion', col1X, tableTop);
        doc.text('Cantidad', col2X, tableTop);
        doc.text('Unidad', col3X, tableTop);

        doc.moveDown(0.5);
        doc.moveTo(col1X, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.5);

        // Table rows
        doc.font('Helvetica');
        request.items.forEach((item, index) => {
          const y = doc.y;

          // Check if we need a new page
          if (y > 700) {
            doc.addPage();
          }

          // Handle long descriptions
          const descWidth = 320;
          doc.text(item.description, col1X, y, { width: descWidth, continued: false });
          doc.text(String(item.quantity), col2X, y, { width: 90 });
          doc.text(item.unit || 'unidad', col3X, y, { width: 65 });

          doc.moveDown(0.3);
        });

        doc.moveDown(1);
      }

      // Specifications
      if (request.specifications) {
        doc.fontSize(14).font('Helvetica-Bold')
          .text('Especificaciones Tecnicas');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica')
          .text(request.specifications, { align: 'justify' });
        doc.moveDown(1);
      }

      // Delivery requirements
      if (request.delivery_location || request.delivery_date) {
        doc.fontSize(14).font('Helvetica-Bold')
          .text('Condiciones de Entrega');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');

        if (request.delivery_location) {
          doc.text(`Lugar de entrega: ${request.delivery_location}`);
        }
        if (request.delivery_date) {
          doc.text(`Fecha requerida: ${new Date(request.delivery_date).toLocaleDateString('es-AR')}`);
        }
        doc.moveDown(1);
      }

      // Instructions for suppliers - check if we need new page
      const currentY = doc.y;
      const spaceNeeded = 300; // Approximate space needed for instructions + contact + footer

      if (currentY + spaceNeeded > doc.page.height - 80) {
        doc.addPage();
      }

      doc.fontSize(14).font('Helvetica-Bold')
        .text('Instrucciones para Proveedores');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');

      doc.list([
        'Por favor, cotice todos los items listados en este documento.',
        'Incluya en su cotizacion: precio unitario, subtotal, impuestos y total.',
        'Indique condiciones de pago y plazo de entrega.',
        'Especifique validez de la cotizacion.',
        `Envie su cotizacion antes del ${new Date(deadline).toLocaleDateString('es-AR')}.`,
        'Para consultas, contacte al departamento de compras.'
      ], 70, doc.y, { bulletRadius: 2 });

      doc.moveDown(2);

      // Contact Information
      doc.fontSize(12).font('Helvetica-Bold')
        .text('Informacion de Contacto');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text('Departamento de Compras');
      doc.text('Asociacion Bernardino Rivadavia');

      // Footer - always at the bottom of the last page
      const footerY = doc.page.height - 60;
      doc.fontSize(8).font('Helvetica')
        .text(
          `Documento generado el ${new Date().toLocaleDateString('es-AR')} a las ${new Date().toLocaleTimeString('es-AR')}`,
          50,
          footerY,
          { align: 'center' }
        );

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Save PDF to a temporary file
 * @param {Buffer} pdfBuffer - PDF buffer
 * @param {string} filename - Filename for the PDF
 * @returns {Promise<string>} Path to saved file
 */
async function savePDFToTemp(pdfBuffer, filename) {
  const tempDir = path.join(__dirname, '../temp');

  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const filepath = path.join(tempDir, filename);
  await fs.promises.writeFile(filepath, pdfBuffer);

  return filepath;
}

/**
 * Delete temporary file
 * @param {string} filepath - Path to file
 */
async function deleteTempFile(filepath) {
  try {
    if (fs.existsSync(filepath)) {
      await fs.promises.unlink(filepath);
    }
  } catch (error) {
    console.error('Error deleting temp file:', error);
  }
}

module.exports = {
  generateRFQPDF,
  savePDFToTemp,
  deleteTempFile
};
