/**
 * Converts the flat 10-field report values into a Tiptap JSON document.
 * This ensures compatibility with existing export and admin systems.
 */
export function mapValuesToTiptap(values, fieldsSchema) {
  const content = [];

  for (const field of fieldsSchema) {
    if (field.type === 'textarea') {
      const value = (values[field.id] || '').trim();
      if (!value) continue;

      // Add Section Heading
      content.push({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: field.label }],
      });

      // Add Content Paragraph(s)
      const paragraphs = value.split('\n').filter(p => p.trim());
      for (const p of paragraphs) {
        content.push({
          type: 'paragraph',
          content: [{ type: 'text', text: p }],
        });
      }
    } else if (field.type === 'group') {
      let groupHasContent = false;
      const groupNodes = [];

      // Create a heading for the group
      groupNodes.push({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: field.label }],
      });

      for (const child of field.children) {
        const childValue = (values[child.id] || '').trim();
        if (!childValue) continue;

        groupHasContent = true;
        // Sub-heading
        groupNodes.push({
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: child.label }],
        });

        // Sub-content
        const paragraphs = childValue.split('\n').filter(p => p.trim());
        for (const p of paragraphs) {
          groupNodes.push({
            type: 'paragraph',
            content: [{ type: 'text', text: p }],
          });
        }
      }

      if (groupHasContent) {
        content.push(...groupNodes);
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
