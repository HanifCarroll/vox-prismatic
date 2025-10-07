import { ref } from 'vue';

export const useHashtags = (hashtagsRef) => {
  const hashtagsInputRef = ref(null);
  const hashtagSuggestions = ref([]);

  const sanitizeHashtag = (raw) => {
    if (typeof raw !== 'string') return '';
    // Normalize commas to spaces, trim, then collapse all whitespace
    // and ensure a single leading '#'. Hashtags are stored with '#'.
    const base = raw.replace(/[,]+/g, ' ').trim();
    const noLeadHash = base.replace(/^#+\s*/, '');
    const compact = noLeadHash.replace(/\s+/g, '');
    if (!compact) return '';
    return `#${compact}`;
  };

  const clearHashtagInput = () => {
    const inputEl = hashtagsInputRef.value?.$refs?.focusInput || hashtagsInputRef.value;
    if (inputEl && 'value' in inputEl) inputEl.value = '';
  };

  const addHashtag = (raw, { moveFocus = true } = {}) => {
    const value = sanitizeHashtag(raw);
    if (!value) return;
    if (!hashtagsRef.value.includes(value)) {
      hashtagsRef.value = [...hashtagsRef.value, value];
    }
    if (moveFocus) clearHashtagInput();
  };

  const handleHashtagKeydown = (event) => {
    if (event.key === ',') {
      event.preventDefault();
      addHashtag(event.target.value);
    }
  };

  const handleHashtagBlur = (event) => {
    addHashtag(event.target.value, { moveFocus: false });
    clearHashtagInput();
  };

  const handleHashtagPaste = (event) => {
    const pasted = event.clipboardData?.getData('text') ?? '';
    if (!pasted) return;
    if (pasted.includes(',')) {
      event.preventDefault();
      pasted.split(',').forEach((entry) => addHashtag(entry, { moveFocus: false }));
      clearHashtagInput();
    }
  };

  const handleHashtagComplete = (event) => {
    const query = sanitizeHashtag(event.query ?? '');
    hashtagSuggestions.value = query ? [query] : [];
  };

  return {
    hashtagsInputRef,
    hashtagSuggestions,
    sanitizeHashtag,
    addHashtag,
    handleHashtagKeydown,
    handleHashtagBlur,
    handleHashtagPaste,
    handleHashtagComplete,
  };
};
