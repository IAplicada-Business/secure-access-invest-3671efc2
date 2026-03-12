import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { content, variables_data, title } = await req.json();

    if (!content || !title) {
      return new Response(
        JSON.stringify({ error: "content and title are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Replace variables in content
    let processedContent = content as string;
    const vars = (variables_data || {}) as Record<string, string>;
    for (const [key, value] of Object.entries(vars)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      processedContent = processedContent.replace(regex, value || "");
    }

    // Generate PDF using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const fontSize = 11;
    const titleFontSize = 18;
    const lineHeight = fontSize * 1.5;
    const margin = 60;
    const pageWidth = 595; // A4
    const pageHeight = 842;
    const maxWidth = pageWidth - margin * 2;

    // Split content into lines
    const paragraphs = processedContent.split("\n");
    const allLines: { text: string; bold: boolean; isTitle: boolean }[] = [];

    // Title
    allLines.push({ text: title, bold: true, isTitle: true });
    allLines.push({ text: "", bold: false, isTitle: false });
    allLines.push({ text: "", bold: false, isTitle: false });

    for (const para of paragraphs) {
      if (!para.trim()) {
        allLines.push({ text: "", bold: false, isTitle: false });
        continue;
      }

      // Check for bold markers **text**
      const isBold = para.startsWith("**") && para.endsWith("**");
      const cleanText = isBold ? para.slice(2, -2) : para;
      const font = isBold ? helveticaBold : helvetica;

      // Word wrap
      const words = cleanText.split(" ");
      let currentLine = "";
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);
        if (width > maxWidth && currentLine) {
          allLines.push({ text: currentLine, bold: isBold, isTitle: false });
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        allLines.push({ text: currentLine, bold: isBold, isTitle: false });
      }
    }

    // Render lines across pages
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    for (const line of allLines) {
      if (y < margin + 20) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }

      if (line.isTitle) {
        page.drawText(line.text, {
          x: margin,
          y,
          size: titleFontSize,
          font: helveticaBold,
          color: rgb(0.15, 0.15, 0.15),
        });
        y -= titleFontSize * 1.5;
      } else if (line.text === "") {
        y -= lineHeight * 0.6;
      } else {
        page.drawText(line.text, {
          x: margin,
          y,
          size: fontSize,
          font: line.bold ? helveticaBold : helvetica,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= lineHeight;
      }
    }

    // Add footer with date
    const dateStr = new Date().toLocaleDateString("pt-BR");
    const footerText = `Gerado em ${dateStr} — J.Imobi`;
    const firstPage = pdfDoc.getPage(0);
    firstPage.drawText(footerText, {
      x: margin,
      y: 30,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();

    // Upload to storage
    const fileName = `${Date.now()}-${title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50)}.pdf`;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: uploadError } = await serviceClient.storage
      .from("generated-documents")
      .upload(fileName, pdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload PDF" }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ file_url: fileName, success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
