function hasMark(marks, type) {
  return Array.isArray(marks) && marks.some((mark) => mark?.type === type);
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function extractText(node) {
  if (!node) {
    return "";
  }

  if (node.type === "text") {
    return node.text || "";
  }

  if (!Array.isArray(node.content)) {
    return "";
  }

  return node.content.map(extractText).join("");
}

function extractRuns(node) {
  if (!node?.content) {
    return [];
  }

  return node.content.flatMap((child) => {
    if (child.type === "text") {
      return [
        {
          text: child.text || "",
          bold: hasMark(child.marks, "bold"),
          italic: hasMark(child.marks, "italic"),
        },
      ];
    }

    if (Array.isArray(child.content)) {
      return extractRuns(child);
    }

    return [];
  });
}

function parseListItems(node) {
  if (!Array.isArray(node?.content)) {
    return [];
  }

  return node.content
    .filter((child) => child?.type === "listItem")
    .map((listItem) => normalizeText(extractText(listItem)))
    .filter(Boolean);
}

function parseNodes(nodes) {
  if (!Array.isArray(nodes)) {
    return [];
  }

  return nodes.flatMap((node) => {
    if (!node) {
      return [];
    }

    switch (node.type) {
      case "doc":
        return parseNodes(node.content);
      case "heading": {
        const text = normalizeText(extractText(node));

        if (!text) {
          return [];
        }

        return [
          {
            type: "heading",
            level: node.attrs?.level || 2,
            text,
          },
        ];
      }
      case "paragraph": {
        const runs = extractRuns(node).filter((run) => run.text);

        if (!runs.length) {
          return [];
        }

        return [
          {
            type: "paragraph",
            runs,
          },
        ];
      }
      case "bulletList":
        return node.content?.length
          ? [
              {
                type: "bulletList",
                items: parseListItems(node),
              },
            ]
          : [];
      case "orderedList":
        return node.content?.length
          ? [
              {
                type: "orderedList",
                items: parseListItems(node),
              },
            ]
          : [];
      case "listItem":
        return [];
      default:
        return Array.isArray(node.content) ? parseNodes(node.content) : [];
    }
  });
}

export default function parseReportContent(tiptapJson) {
  if (!tiptapJson) {
    return [];
  }

  if (tiptapJson.type === "doc") {
    return parseNodes(tiptapJson.content);
  }

  return parseNodes([tiptapJson]);
}
