const PARAGRAPH_SPLIT = /\n{2,}/;

export const normalizeHook = (hook) => {
    if (!hook) {
        return '';
    }
    return hook.replace(/\s+/g, ' ').trim();
};

export const deriveHookFromContent = (content) => {
    if (!content) {
        return '';
    }
    const [first = ''] = String(content).split(PARAGRAPH_SPLIT);
    return first.trim();
};

export const mergeHookIntoContent = (content, hook) => {
    const normalized = normalizeHook(hook);
    if (!content) {
        return normalized;
    }
    const parts = String(content).split(PARAGRAPH_SPLIT);
    if (!parts.length) {
        return normalized;
    }
    parts[0] = normalized;
    return parts
        .map((part, index) => (index === 0 ? part.trim() : part.trimEnd()))
        .join('\n\n')
        .trimEnd();
};

export const limitFrameworkSelection = (currentIds, nextId, checked) => {
    const list = Array.isArray(currentIds) ? currentIds.slice() : [];
    const id = String(nextId);
    if (checked) {
        if (list.includes(id)) {
            return list;
        }
        if (list.length >= 5) {
            return list;
        }
        list.push(id);
        return list;
    }
    return list.filter((candidate) => candidate !== id);
};
