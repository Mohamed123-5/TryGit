'use strict';
// Single source of truth for a flow's Run Type classification.
//
// THE TAG IS THE SOURCE OF TRUTH, NOT THE FOLDER. A flow's classification comes from the `tags:`
// list in its own Maestro config header - the property Maestro 2.9.0 itself reads (YamlConfig.tags)
// and filters on with --include-tags / --exclude-tags. Folders only organise the suite: a flow
// moved elsewhere, or a new flow added anywhere, is classified correctly from its tag alone.
//
// Tags are classification metadata only. Nothing here affects execution order, safety flags or a
// verdict.

const fs = require('fs');

const RUN_TYPES = {
  critical: 'Critical',
  'happy-path': 'Happy Path',
  'health-check': 'Health Check',
};

// Dashboard scopes, defined purely by tag membership.
const SCOPES = {
  readiness: ['critical', 'happy-path'],
  'health-check': ['health-check'],
};

// "Happy Path", "happy_path", "HAPPY-PATH" -> "happy-path".
function normalizeTag(tag) {
  return String(tag)
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');
}

/**
 * Reads the `tags:` list from a flow's config header (the part before the first `---`).
 * Supports the two YAML forms Maestro accepts for a list:
 *   tags:            tags: [critical, smoke]
 *     - critical
 * @returns {string[]} normalized, de-duplicated tags; [] when the header declares none.
 */
function parseFlowTags(yamlText) {
  const lines = String(yamlText).split(/\r?\n/);
  const end = lines.findIndex((l) => /^---\s*$/.test(l));
  const header = end >= 0 ? lines.slice(0, end) : lines;

  const i = header.findIndex((l) => /^tags\s*:/.test(l));
  if (i < 0) return [];

  const tags = [];
  const inline = header[i].replace(/^tags\s*:\s*/, '').replace(/\s+#.*$/, '').trim();
  if (inline.startsWith('[')) {
    tags.push(...inline.replace(/^\[|\]$/g, '').split(','));
  } else if (inline) {
    tags.push(inline);
  } else {
    for (let j = i + 1; j < header.length; j++) {
      const l = header[j];
      if (/^\s*(#.*)?$/.test(l)) continue;
      const m = /^\s+-\s*(.+?)\s*(#.*)?$/.exec(l);
      if (!m) break; // next top-level key
      tags.push(m[1]);
    }
  }
  return [...new Set(tags.map(normalizeTag).filter(Boolean))];
}

function readFlowTags(flowFile) {
  try {
    return parseFlowTags(fs.readFileSync(flowFile, 'utf8'));
  } catch {
    return [];
  }
}

module.exports = { RUN_TYPES, SCOPES, normalizeTag, parseFlowTags, readFlowTags };
