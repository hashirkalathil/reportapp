import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
  Font,
} from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import parseReportContent from "../../../lib/parseReportContent";
import supabaseAdmin from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ],
});

  Font.register({
  family: 'Noto Sans Malayalam',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/notosansmalayalam/v18/bWtj7f-wwnxG5uE5TqBtwUuV1V-P9yH2y4jQ.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/notosansmalayalam/v18/bWth7f-wwnxG5uE5TqBtwUuV1V-P9zHo4YH8S8Y.ttf', fontWeight: 700 }
  ]
});

const styles = StyleSheet.create({
  page: {
    paddingTop: 65,
    paddingBottom: 65,
    paddingHorizontal: 55,
    fontFamily: "Roboto",
    fontSize: 11,
    lineHeight: 1.6,
    color: "#334155",
    backgroundColor: "#ffffff",
  },
  header: {
    position: 'absolute',
    top: 30,
    left: 55,
    right: 55,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 10,
  },
  headerText: {
    fontSize: 9,
    color: "#94a3b8",
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 55,
    right: 55,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 9,
    color: "#94a3b8",
  },
  cover: {
    marginTop: 80,
    marginBottom: 60,
    paddingBottom: 30,
    borderBottomWidth: 3,
    borderBottomColor: "#5D5FEF", // Indigo accent
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  subtitleLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#64748b",
    width: 100,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitleValue: {
    fontSize: 11,
    color: "#334155",
  },
  heading2: {
    fontSize: 18,
    fontWeight: 700,
    color: "#0f172a",
    marginTop: 24,
    marginBottom: 12,
  },
  heading3: {
    fontSize: 13,
    fontWeight: 700,
    color: "#5D5FEF",
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 8,
  },
  paragraph: {
    marginBottom: 12,
    textAlign: "justify",
  },
  list: {
    marginBottom: 12,
    paddingLeft: 8,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 6,
  },
  bullet: {
    width: 16,
    color: "#5D5FEF",
    fontWeight: 700,
  },
  listText: {
    flex: 1,
    textAlign: "justify",
  },
});

function sanitizeFilenamePart(value) {
  return String(value || "report")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "-");
}

function formatSubmissionDate(value) {
  if (!value) return "DRAFT";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "long",
  }).format(new Date(value));
}

function getClientName(report) {
  if (report?.clients?.name) return report.clients.name;
  if (Array.isArray(report?.clients) && report.clients[0]?.name) return report.clients[0].name;
  return "Unknown Client";
}

function PdfReportDocument({ clientName, reportMonth, submissionDate, blocks }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Fixed Header */}
        <View style={styles.header} fixed>
          <Text style={styles.headerText}>ReportGen Pro</Text>
          <Text style={styles.headerText}>{reportMonth}</Text>
        </View>

        {/* Cover Section */}
        <View style={styles.cover}>
          <Text style={styles.title}>{clientName}</Text>
          
          <View style={styles.subtitleRow}>
            <Text style={styles.subtitleLabel}>Period</Text>
            <Text style={styles.subtitleValue}>{reportMonth}</Text>
          </View>
          
          <View style={styles.subtitleRow}>
            <Text style={styles.subtitleLabel}>Generated On</Text>
            <Text style={styles.subtitleValue}>{formatSubmissionDate(submissionDate)}</Text>
          </View>
          
          <View style={styles.subtitleRow}>
            <Text style={styles.subtitleLabel}>Status</Text>
            <Text style={[styles.subtitleValue, { color: submissionDate ? '#10b981' : '#f59e0b', fontWeight: 700 }]}>
              {submissionDate ? 'FINAL' : 'DRAFT'}
            </Text>
          </View>
        </View>

        {/* Content Blocks */}
        {blocks.map((block, index) => {
          if (block.type === "heading") {
            return (
              <Text key={`${block.type}-${index}`} style={block.level === 3 ? styles.heading3 : styles.heading2}>
                {block.text}
              </Text>
            );
          }

          if (block.type === "paragraph") {
            return (
              <Text key={`${block.type}-${index}`} style={styles.paragraph}>
                {block.runs.map((run, runIndex) => (
                  <Text key={`${block.type}-${index}-${runIndex}`} style={{
                    fontWeight: run.bold ? 700 : 400,
                    fontStyle: run.italic ? "italic" : "normal",
                    fontFamily: run.text && /[\u0D00-\u0D7F]/.test(run.text) ? "Noto Sans Malayalam" : "Roboto",
                  }}>
                    {run.text}
                  </Text>
                ))}
              </Text>
            );
          }

          if (block.type === "bulletList" || block.type === "orderedList") {
            return (
              <View key={`${block.type}-${index}`} style={styles.list}>
                {block.items.map((item, itemIndex) => (
                  <View key={`${block.type}-${index}-${itemIndex}`} style={styles.listItem}>
                    <Text style={styles.bullet}>
                      {block.type === "orderedList" ? `${itemIndex + 1}.` : "•"}
                    </Text>
                    <Text style={styles.listText}>{item}</Text>
                  </View>
                ))}
              </View>
            );
          }
          return null;
        })}

        {/* Fixed Footer with Page Numbers */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{clientName}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function GET(request) {
  const reportId = request.nextUrl.searchParams.get("reportId");

  if (!reportId) {
    return NextResponse.json({ error: "Missing reportId" }, { status: 400 });
  }

  const { data: report, error } = await supabaseAdmin
    .from("reports")
    .select(`id, report_month, content, created_at, updated_at, status, clients (name)`)
    .eq("id", reportId)
    .single();

  if (error || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const clientName = getClientName(report);
  const blocks = parseReportContent(report.content);
  // Only show a final submission date if it's actually submitted
  const submissionDate = report.status === 'submitted' ? report.updated_at : null;

  const buffer = await pdf(
    <PdfReportDocument
      clientName={clientName}
      reportMonth={report.report_month}
      submissionDate={submissionDate}
      blocks={blocks}
    />
  ).toBuffer();

  const filename = `report-${sanitizeFilenamePart(clientName)}-${sanitizeFilenamePart(report.report_month)}.pdf`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
