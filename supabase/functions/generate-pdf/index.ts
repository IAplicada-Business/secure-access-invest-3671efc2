import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Brand colors
const GOLD = rgb(201 / 255, 169 / 255, 97 / 255); // #C9A961
const GRAPHITE = rgb(61 / 255, 61 / 255, 61 / 255); // #3D3D3D
const LIGHT_GRAY = rgb(0.6, 0.6, 0.6);
const WHITE = rgb(1, 1, 1);

function decodeHtmlEntities(value: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " ",
  };

  return value.replace(/&(#x?[0-9a-f]+|\w+);/gi, (entity, code) => {
    if (code[0] === "#") {
      const radix = code[1]?.toLowerCase() === "x" ? 16 : 10;
      const rawCodePoint = code[1]?.toLowerCase() === "x" ? code.slice(2) : code.slice(1);
      const codePoint = Number.parseInt(rawCodePoint, radix);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }

    return namedEntities[code.toLowerCase()] || entity;
  });
}

function normalizeTemplateContentForPdf(content: string) {
  if (!/<\/?[a-z][\s\S]*>/i.test(content)) return content;

  const text = content
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<h[1-6][^>]*>/gi, "\n**")
    .replace(/<\/h[1-6]>/gi, "**\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|header|footer|tr|table)>/gi, "\n")
    .replace(/<\/(td|th)>/gi, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return decodeHtmlEntities(text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    processedContent = processedContent.replace(/\{\{\s*\w+\s*\}\}/g, "");
    processedContent = normalizeTemplateContentForPdf(processedContent);

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const bodySize = 10.5;
    const sectionSize = 13;
    const titleSize = 20;
    const lineHeight = bodySize * 1.7;
    const sectionLineHeight = sectionSize * 1.8;
    const marginLeft = 70;
    const marginRight = 70;
    const marginTop = 80;
    const marginBottom = 60;
    const pageWidth = 595;
    const pageHeight = 842;
    const maxWidth = pageWidth - marginLeft - marginRight;

    // --- Helper: draw page chrome (header bar + footer) ---
    function drawPageChrome(page: any, pageNum: number, totalPages: number) {
      // Top gold bar
      page.drawRectangle({
        x: 0,
        y: pageHeight - 8,
        width: pageWidth,
        height: 8,
        color: GOLD,
      });

      // Header: marca "TIJOLO EM CAPITAL"
      page.drawText("TIJOLO", {
        x: marginLeft,
        y: pageHeight - 36,
        size: 18,
        font: helveticaBold,
        color: GOLD,
      });
      page.drawText(" EM CAPITAL", {
        x: marginLeft + helveticaBold.widthOfTextAtSize("TIJOLO", 18),
        y: pageHeight - 36,
        size: 18,
        font: helvetica,
        color: GRAPHITE,
      });
      page.drawText("Plataforma de Gestão e Regularização de Imóveis", {
        x: marginLeft,
        y: pageHeight - 50,
        size: 7.5,
        font: helvetica,
        color: LIGHT_GRAY,
      });

      // Footer separator line
      page.drawRectangle({
        x: marginLeft,
        y: marginBottom - 15,
        width: maxWidth,
        height: 0.5,
        color: GOLD,
      });

      // Footer text
      const dateStr = new Date().toLocaleDateString("pt-BR");
      const footerLeft = `Tijolo em Capital  •  ${dateStr}`;
      const footerRight = `${pageNum} / ${totalPages}`;
      page.drawText(footerLeft, {
        x: marginLeft,
        y: marginBottom - 28,
        size: 7.5,
        font: helvetica,
        color: LIGHT_GRAY,
      });
      page.drawText(footerRight, {
        x: pageWidth - marginRight - helvetica.widthOfTextAtSize(footerRight, 7.5),
        y: marginBottom - 28,
        size: 7.5,
        font: helvetica,
        color: LIGHT_GRAY,
      });
    }

    // --- Parse content into render instructions ---
    interface RenderLine {
      text: string;
      type: "title" | "section" | "body" | "blank";
      bold: boolean;
    }

    const paragraphs = processedContent.split("\n");
    const renderLines: RenderLine[] = [];

    // Document title
    renderLines.push({ text: title, type: "title", bold: true });
    renderLines.push({ text: "", type: "blank", bold: false });

    for (const para of paragraphs) {
      if (!para.trim()) {
        renderLines.push({ text: "", type: "blank", bold: false });
        continue;
      }

      const isBold = para.startsWith("**") && para.endsWith("**");
      const cleanText = isBold ? para.slice(2, -2) : para;

      if (isBold) {
        // Section header
        renderLines.push({ text: "", type: "blank", bold: false });
        renderLines.push({ text: cleanText, type: "section", bold: true });
        continue;
      }

      // Word wrap body text
      const font = helvetica;
      const words = cleanText.split(" ");
      let currentLine = "";
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, bodySize);
        if (width > maxWidth && currentLine) {
          renderLines.push({ text: currentLine, type: "body", bold: false });
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        renderLines.push({ text: currentLine, type: "body", bold: false });
      }
    }

    // --- First pass: lay out pages to count total ---
    interface PageBreak { lineIndex: number; }
    const pageBreaks: number[] = [0]; // line indices where new pages start
    let y = pageHeight - marginTop - 50; // after header

    for (let i = 0; i < renderLines.length; i++) {
      const line = renderLines[i];
      let needed = lineHeight;
      if (line.type === "title") needed = titleSize * 2 + 10;
      else if (line.type === "section") needed = sectionLineHeight + 12;
      else if (line.type === "blank") needed = lineHeight * 0.5;

      if (y - needed < marginBottom) {
        pageBreaks.push(i);
        y = pageHeight - marginTop - 15;
      }
      y -= needed;
    }

    const totalPages = pageBreaks.length;

    // --- Second pass: render ---
    let currentPageIdx = 0;
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - marginTop - 50;

    for (let i = 0; i < renderLines.length; i++) {
      const line = renderLines[i];
      let needed = lineHeight;
      if (line.type === "title") needed = titleSize * 2 + 10;
      else if (line.type === "section") needed = sectionLineHeight + 12;
      else if (line.type === "blank") needed = lineHeight * 0.5;

      if (y - needed < marginBottom) {
        currentPageIdx++;
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - marginTop - 15;
      }

      if (line.type === "title") {
        page.drawText(line.text, {
          x: marginLeft,
          y,
          size: titleSize,
          font: helveticaBold,
          color: GRAPHITE,
        });
        y -= titleSize + 6;
        // Gold underline
        page.drawRectangle({
          x: marginLeft,
          y,
          width: 80,
          height: 2.5,
          color: GOLD,
        });
        y -= 14;
      } else if (line.type === "section") {
        y -= 4;
        page.drawText(line.text, {
          x: marginLeft,
          y,
          size: sectionSize,
          font: helveticaBold,
          color: GRAPHITE,
        });
        y -= 5;
        // Gold underline for section
        const textW = helveticaBold.widthOfTextAtSize(line.text, sectionSize);
        page.drawRectangle({
          x: marginLeft,
          y,
          width: Math.min(textW + 10, maxWidth),
          height: 1.5,
          color: GOLD,
        });
        y -= sectionLineHeight * 0.3;
      } else if (line.type === "blank") {
        y -= lineHeight * 0.5;
      } else {
        page.drawText(line.text, {
          x: marginLeft,
          y,
          size: bodySize,
          font: helvetica,
          color: GRAPHITE,
        });
        y -= lineHeight;
      }
    }

    // Draw chrome on all pages
    const pages = pdfDoc.getPages();
    for (let p = 0; p < pages.length; p++) {
      drawPageChrome(pages[p], p + 1, pages.length);
    }

    const pdfBytes = await pdfDoc.save();

    // Upload
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
