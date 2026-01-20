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

        // Get the actual image dimensions
        const imageDims = image.scale(1);
        
        // Create a page that matches the image aspect ratio
        // Target width of ~11 inches (792 points), scale height to match image aspect ratio
        const targetWidth = 11 * 72; // 11 inches in points
        const aspectRatio = imageDims.width / imageDims.height;
        const pageWidth = targetWidth;
        const pageHeight = targetWidth / aspectRatio;
        
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        
        // Draw image to fill the entire page (no borders)
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        });
      } catch (error) {
        console.error(`Error processing slide ${url}:`, error);
        // Continue with other slides
      }
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Return PDF as response
    return new NextResponse(Buffer.from(pdfBytes), {
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
