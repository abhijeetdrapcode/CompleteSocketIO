export const Config = {
  SETTINGS: {
    anonymization: {
      patterns: {
        emails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        names: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g,
        phones: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
        ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
      },
      replacements: {
        emails: '[REDACTED_EMAIL]',
        names: '[REDACTED_NAME]',
        phones: '[REDACTED_PHONE]',
        ssn: '[REDACTED_SSN]',
      },
    },
  },
};

class AnonymizationError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'AnonymizationError';
    this.code = code;
    this.details = details;
  }
}

let processorState = {
  document: null,
  patterns: null,
  rejectedTerms: new Set(),
  changes: [],
};

function clearState() {
  processorState.patterns = null;
  processorState.rejectedTerms = new Set();
  processorState.changes = [];
  processorState.document = null;
}

function normalizeContent(content) {
  if (typeof content !== 'string') {
    throw new AnonymizationError('Invalid content type provided', 'INVALID_CONTENT_TYPE', {
      type: typeof content,
    });
  }

  try {
    const segments = content.split('\n').map((line) => ({
      originalLine: line, // Keep the full original line
      content: line
        // eslint-disable-next-line
        .replace(/[\x00-\x08\x0B-\x1F\x7F-\x9F]/g, '')
        .replace(/^ÿþ/, '')
        .trim(),
      indentation: line.match(/^\s*/)[0].length,
      leadingSpace: line.match(/^\s*/)[0],
      trailingSpace: line.match(/\s*$/)[0],
    }));

    return segments;
  } catch (error) {
    throw new AnonymizationError('Content normalization failed', 'NORMALIZATION_ERROR', {
      originalError: error.message,
    });
  }
}

function getMatchContext(content, term, contextSize = 50) {
  try {
    content = content.trim();
    term = term.trim();
    const index = content.toLowerCase().indexOf(term.toLowerCase());
    if (index === -1) return '';

    const start = Math.max(0, index - contextSize);
    const end = Math.min(content.length, index + term.length + contextSize);
    return content.substring(start, end);
  } catch (error) {
    console.warn('Error getting match context:', error);
    return '';
  }
}

function escapeRegExp(string) {
  if (typeof string !== 'string') {
    throw new AnonymizationError(
      'Invalid string type for RegExp escaping',
      'INVALID_REGEXP_INPUT',
      { type: typeof string },
    );
  }
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function initializePatterns() {
  try {
    if (processorState.patterns) return;

    processorState.patterns = new Map();
    Object.entries(Config.SETTINGS.anonymization.patterns).forEach(([key, pattern]) => {
      processorState.patterns.set(key, pattern);
    });

    processorState.changes = [];
    processorState.rejectedTerms = new Set();
  } catch (error) {
    throw new AnonymizationError('Pattern initialization failed', 'PATTERN_INIT_ERROR', {
      originalError: error.message,
    });
  }
}

async function detectCustomTerms(content, terms) {
  try {
    if (!content || !terms) {
      throw new AnonymizationError('Missing required parameters', 'INVALID_PARAMETERS', {
        hasContent: !!content,
        hasTerms: !!terms,
      });
    }

    processorState.changes = [];

    const termList = terms
      .split(',')
      .filter((term) => term && !processorState.rejectedTerms.has(term.toLowerCase()));

    for (const term of termList) {
      const termPattern = new RegExp(escapeRegExp(term), 'gi');
      const matches = content.match(termPattern) || [];

      if (matches.length > 0) {
        const change = {
          id: `term_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
          original: term,
          replacement: `[REDACTED_CUSTOM_${Date.now().toString(36)}]`,
          type: 'custom',
          status: 'pending',
          occurrences: matches.length,
          metadata: {
            originalTerm: term,
            matchedVariants: [...new Set(matches)],
            matchCount: matches.length,
            samples: matches.slice(0, 3),
            contexts: matches.slice(0, 3).map((match) => getMatchContext(content, match)),
            confidence: 1.0,
          },
        };
        processorState.changes.push(change);
      }
    }
    return processorState.changes;
  } catch (error) {
    if (error instanceof AnonymizationError) {
      throw error;
    }
    throw new AnonymizationError('Custom term detection failed', 'CUSTOM_TERM_ERROR', {
      originalError: error.message,
    });
  }
}

export function initializeProcessor(document) {
  if (!document) {
    throw new AnonymizationError('Document reference required', 'MISSING_DOCUMENT');
  }
  processorState.document = document;
  return {
    process: processAnonymization.bind(null),
    clearState,
    detectCustomTerms,
  };
}

export async function processAnonymization(content, customTerms = '') {
  try {
    if (!content) {
      throw new AnonymizationError('Content is required', 'MISSING_CONTENT');
    }

    await initializePatterns();
    let processedContent = '';
    if (customTerms) {
      const customChanges = await detectCustomTerms(content, customTerms);
      content = applyChanges(content, customChanges);
    }
    let segments = normalizeContent(content);
    const anonymizedSegments = segments.map((segment) => {
      let anonymizedContent = segment.content;
      Object.entries(Config.SETTINGS.anonymization.patterns).forEach(([key, pattern]) => {
        const replacement = Config.SETTINGS.anonymization.replacements[key];
        anonymizedContent = anonymizedContent.replace(pattern, replacement);
      });
      const anonymizedLine = segment.leadingSpace + anonymizedContent + segment.trailingSpace;
      return anonymizedLine;
    });
    processedContent = anonymizedSegments.join('\n');
    return processedContent;
  } catch (error) {
    if (error instanceof AnonymizationError) {
      throw error;
    }
    throw new AnonymizationError('Anonymization process failed', 'PROCESS_ERROR', {
      originalError: error.message,
    });
  }
}

function applyChanges(content, changes) {
  try {
    if (!content || !Array.isArray(changes)) {
      throw new AnonymizationError(
        'Invalid parameters for applying changes',
        'INVALID_APPLY_PARAMS',
        { hasContent: !!content, changesType: typeof changes },
      );
    }

    let result = '';

    for (const change of changes) {
      if (!change.original || !change.replacement) {
        console.warn('Skipping invalid change:', change);
        continue;
      }
      const regex = new RegExp(escapeRegExp(change.original), 'gi');
      result = content.replace(regex, change.replacement);
    }

    return result;
  } catch (error) {
    if (error instanceof AnonymizationError) {
      throw error;
    }
    throw new AnonymizationError('Error applying changes', 'APPLY_CHANGES_ERROR', {
      originalError: error.message,
    });
  }
}
