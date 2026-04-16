import {
  AlignmentType,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { NextResponse } from "next/server";
import parseReportContent from "../../../lib/parseReportContent";
import { db } from "../../../lib/firebaseAdmin";

export const runtime = "nodejs";

function sanitizeFilenamePart(value) {
  return String(value || "report")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "-");
}

function getClientName(report) {
  if (report?.clients?.name) {
    return report.clients.name;
  }

  if (Array.isArray(report?.clients) && report.clients[0]?.name) {
    return report.clients[0].name;
  }

  return "Unknown Client";
}

function createParagraphRuns(runs) {
  return runs.map(
    (run) =>
      new TextRun({
        text: run.text,
        bold: run.bold,
        italics: run.italic,
      })
  );
}

export async function GET(request) {
  const reportId = request.nextUrl.searchParams.get("reportId");

  if (!reportId) {
    return NextResponse.json({ error: "Missing reportId" }, { status: 400 });
  }

  let report, clientName = "Unknown Client";

  try {
    const reportDoc = await db.collection("reports").doc(reportId).get();
    if (!reportDoc.exists) throw new Error("Report not found");
    
    report = reportDoc.data();
    report.id = reportDoc.id;

    if (report.client_id) {
      const clientDoc = await db.collection("clients").doc(report.client_id).get();
      if (clientDoc.exists) {
        clientName = clientDoc.data().name || "Unknown Client";
      }
    }
  } catch (error) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const blocks = parseReportContent(report.content);

  const children = [
    new Paragraph({
      text: clientName,
      heading: HeadingLevel.TITLE,
      spacing: {
        after: 120,
      },
    }),
    new Paragraph({
      text: report.report_month,
      spacing: {
        after: 280,
      },
    }),
  ];

  blocks.forEach((block) => {
    if (block.type === "heading") {
      children.push(
        new Paragraph({
          text: block.text,
          heading:
            block.level === 3 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_2,
        })
      );
      return;
    }

    if (block.type === "paragraph") {
      children.push(
        new Paragraph({
          children: createParagraphRuns(block.runs),
        })
      );
      return;
    }

    if (block.type === "bulletList") {
      block.items.forEach((item) => {
        children.push(
          new Paragraph({
            text: item,
            bullet: {
              level: 0,
            },
          })
        );
      });
      return;
    }

    if (block.type === "orderedList") {
      block.items.forEach((item) => {
        children.push(
          new Paragraph({
            text: item,
            numbering: {
              reference: "report-numbering",
              level: 0,
            },
          })
        );
      });
    }
  });

  const document = new Document({
    numbering: {
      config: [
        {
          reference: "report-numbering",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.START,
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(document);
  const filename = `report-${sanitizeFilenamePart(clientName)}-${sanitizeFilenamePart(
    report.report_month
  )}.docx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
