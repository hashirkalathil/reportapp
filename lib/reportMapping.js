/**
 * Converts the flat 10-field report values into a Tiptap JSON document.
 * This ensures compatibility with existing export and admin systems.
 */
function formatValue(value, type) {
  if (!value) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value).trim();
}

export function mapValuesToTiptap(values, fieldsSchema) {
  const content = [];

  for (const field of fieldsSchema) {
    const isGroup = field.type === 'group';
    const fieldValues = isGroup 
      ? field.children.map(c => ({ label: c.label, val: formatValue(values[c.id]) })).filter(cv => cv.val)
      : [{ label: field.label, val: formatValue(values[field.id], field.type) }];

    const hasContent = fieldValues.length > 0 && fieldValues.some(fv => fv.val);
    if (!hasContent) continue;

    // Add Section Heading
    content.push({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: field.label }],
    });

    if (isGroup) {
      for (const fv of fieldValues) {
        content.push({
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: fv.label }],
        });
        const paragraphs = fv.val.split('\n').filter(p => p.trim());
        for (const p of paragraphs) {
          content.push({
            type: 'paragraph',
            content: [{ type: 'text', text: p }],
          });
        }
      }
    } else {
      const val = fieldValues[0].val;
      const paragraphs = val.split('\n').filter(p => p.trim());
      for (const p of paragraphs) {
        content.push({
          type: 'paragraph',
          content: [{ type: 'text', text: p }],
        });
      }
    }
  }

  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph' }],
  };
}

/**
 * Attempts to reconstruct flat values from a Tiptap JSON document.
 * (Partial implementation - matches headings to field labels)
 */
export function mapTiptapToValues(json, fieldsSchema) {
  if (!json || json.type !== 'doc' || !Array.isArray(json.content)) {
    return {};
  }

  const values = {};
  let currentFieldId = null;

  for (const node of json.content) {
    if (node.type === 'heading') {
      const headingText = node.content?.[0]?.text;
      
      // Look for a field that matches this heading
      const field = fieldsSchema.find(f => f.label === headingText);
      if (field) {
        currentFieldId = field.type === 'textarea' ? field.id : null;
      } else {
        // Check children of groups
        for (const f of fieldsSchema) {
          if (f.type === 'group') {
            const child = f.children.find(c => c.label === headingText);
            if (child) {
              currentFieldId = child.id;
              break;
            }
          }
        }
      }
    } else if (node.type === 'paragraph' && currentFieldId) {
      const text = node.content?.[0]?.text || '';
      if (text) {
        values[currentFieldId] = values[currentFieldId] 
          ? `${values[currentFieldId]}\n${text}` 
          : text;
      }
    }
  }

  return values;
}
