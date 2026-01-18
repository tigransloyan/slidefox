import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export async function POST(request: NextRequest) {
  try {
    const { slideUrls } = await request.json();

    if (!Array.isArray(slideUrls) || slideUrls.length === 0) {
      return NextResponse.json(
        { error: 'No slide URLs provided' },
        { status: 400 },
      );
    }

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    // Fetch each slide image and add as a page
    for (const url of slideUrls) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`Failed to fetch slide: ${url}`);
          continue;
        }

        const imageBytes = await response.arrayBuffer();
        
        // Determine image type from response headers or URL
        const contentType = response.headers.get('content-type') || '';
        let image;
        
        const isPng = contentType.includes('png') || url.includes('.png');
        const isJpg = contentType.includes('jpeg') || contentType.includes('jpg') || url.includes('.jpg') || url.includes('.jpeg');
        
        // Try the detected format first, fall back to the other if it fails
        if (isPng) {
          image = await pdfDoc.embedPng(imageBytes);
        } else if (isJpg) {
          image = await pdfDoc.embedJpg(imageBytes);
        } else {
          // Unknown format - try PNG first, then JPG
          try {
            image = await pdfDoc.embedPng(imageBytes);
          } catch {
            image = await pdfDoc.embedJpg(imageBytes);
          }
        }

        // Create a page with 16:9 aspect ratio (1792x1024)
        // Standard US Letter is 8.5x11 inches, but we'll use a 16:9 page
        const pageWidth = 11 * 72; // 11 inches in points
        const pageHeight = (11 * 72) / (16 / 9); // Maintain 16:9 ratio
        
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        
        // Scale image to fit page while maintaining aspect ratio
        const imageDims = image.scale(1);
        const scale = Math.min(
          pageWidth / imageDims.width,
          pageHeight / imageDims.height,
        );
        
        page.drawImage(image, {
          x: (pageWidth - imageDims.width * scale) / 2,
          y: (pageHeight - imageDims.height * scale) / 2,
          width: imageDims.width * scale,
          height: imageDims.height * scale,
        });
      } catch (error) {
        console.error(`Error processing slide ${url}:`, error);
        // Continue with other slides
      }
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Return PDF as response
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="presentation.pdf"',
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 },
    );
  }
}
