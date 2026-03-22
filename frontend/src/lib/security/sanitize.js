import DOMPurify from 'dompurify';

/**
 * Sanitizes an HTML string to prevent XSS attacks.
 * Uses DOMPurify under the hood. For isomorphic rendering, it checks for window.
 */
export const sanitizeHtml = (dirtyHtml) => {
  if (typeof window === 'undefined') {
    return dirtyHtml; // Server-side rendering (handled by React naturally)
  }
  return DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
};

/**
 * Strips all HTML tags from a string (useful for plain text inputs).
 */
export const stripHtml = (dirtyString) => {
  if (typeof window === 'undefined') return dirtyString;
  return DOMPurify.sanitize(dirtyString, { ALLOWED_TAGS: [] });
};
