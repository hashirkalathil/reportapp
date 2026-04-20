export const DEFAULT_REPORT_FIELDS = [
  {
    id: "academic_activities",
    number: 1,
    label: "Academic Activities",
    type: "textarea",
  },
  {
    id: "cocurricular_activities",
    number: 2,
    label: "Co-curricular Activities",
    type: "textarea",
    hints: ["Class Union", "Ahsan Contest", "External Contest"],
  },
  {
    id: "action_weak_section",
    number: 3,
    label: "Action for the Weak Section",
    type: "group",
    children: [
      { id: "action_weak_academic", label: "Academic Activities" },
      { id: "action_weak_cocurricular", label: "Co-curricular Activities" },
    ],
  },
  {
    id: "behavioural_change",
    number: 4,
    label: "Behavioural Change",
    type: "textarea",
  },
  {
    id: "personal_care",
    number: 5,
    label: "Personal Care",
    type: "textarea",
  },
  {
    id: "health",
    number: 6,
    label: "Health",
    type: "group",
    children: [
      { id: "health_mental", label: "Mental Health" },
      { id: "health_physical", label: "Physical Health" },
    ],
  },
  {
    id: "hygiene",
    number: 7,
    label: "Hygiene",
    type: "group",
    children: [
      { id: "hygiene_personal", label: "Personal" },
      { id: "hygiene_spaces", label: "Spaces" },
      { id: "hygiene_sick", label: "Sick" },
    ],
  },
  {
    id: "documentation",
    number: 8,
    label: "Documentation",
    type: "textarea",
  },
  {
    id: "annual_goals",
    number: 9,
    label: "Annual Goals",
    type: "textarea",
  },
  {
    id: "others",
    number: 10,
    label: "Others",
    type: "textarea",
  },
];

function normalizeField(field, index) {
  const safeId = String(field?.id || `field_${index + 1}`)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const type = field?.type || "textarea";
  
  const result = {
    id: safeId || `field_${index + 1}`,
    number: index + 1,
    label: String(field?.label || `Field ${index + 1}`).trim(),
    type: type,
    required: !!field?.required,
  };

  if (Array.isArray(field?.hints)) {
    result.hints = field.hints.map((hint) => String(hint || "").trim()).filter(Boolean);
  }

  // Handle options for choice types
  if (["checkbox", "radio", "select"].includes(type)) {
    result.options = Array.isArray(field?.options) 
      ? field.options.map(opt => String(opt || "").trim()).filter(Boolean)
      : [];
  }

  return result;
}

function normalizeGroupField(field, index) {
  const safeId = String(field?.id || `group_${index + 1}`)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const children = Array.isArray(field?.children)
    ? field.children
        .map((child, childIndex) => {
          const childId = String(child?.id || `${safeId || `group_${index + 1}`}_field_${childIndex + 1}`)
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]+/g, "_")
            .replace(/^_+|_+$/g, "");

          return {
            id: childId || `${safeId || `group_${index + 1}`}_field_${childIndex + 1}`,
            label: String(child?.label || `Sub Field ${childIndex + 1}`).trim(),
            // Sub-questions in this implementation are typically simple text inputs
            // but we can pass through properties if needed.
          };
        })
        .filter((child) => child.label)
    : [];

  const result = {
    id: safeId || `group_${index + 1}`,
    number: index + 1,
    label: String(field?.label || `Group ${index + 1}`).trim(),
    type: "group",
    required: !!field?.required,
    children,
  };

  if (Array.isArray(field?.hints)) {
    result.hints = field.hints.map((hint) => String(hint || "").trim()).filter(Boolean);
  }

  return result;
}

export function normalizeReportFields(candidateFields) {
  if (!Array.isArray(candidateFields) || candidateFields.length === 0) {
    return DEFAULT_REPORT_FIELDS;
  }

  const normalized = candidateFields
    .map((field, index) => {
      if (!field || typeof field !== "object") return null;
      if (field.type === "group") {
        const groupField = normalizeGroupField(field, index);
        return groupField.children.length > 0 ? groupField : null;
      }
      return normalizeField(field, index);
    })
    .filter(Boolean);

  if (normalized.length === 0) {
    return DEFAULT_REPORT_FIELDS;
  }

  return normalized.map((field, index) => ({ ...field, number: index + 1 }));
}

export function listFormTextareaKeys(fieldsSchema) {
  const fields = normalizeReportFields(fieldsSchema);
  const keys = [];

  for (const field of fields) {
    if (field.type === "group") {
      for (const child of field.children || []) {
        keys.push(child.id);
      }
    } else {
      keys.push(field.id);
    }
  }

  return keys;
}
