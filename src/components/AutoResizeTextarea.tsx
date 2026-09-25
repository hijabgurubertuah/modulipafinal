import React, { useEffect, useRef } from 'react';

export interface AutoResizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  minRows?: number;
}

export const AutoResizeTextarea = React.forwardRef<
  HTMLTextAreaElement,
  AutoResizeTextareaProps
>(({ value, onChange, minRows = 1, className = '', style, ...props }, ref) => {
  const internalRef = useRef<HTMLTextAreaElement | null>(null);

  const adjustHeight = () => {
    const el = (ref && typeof ref !== 'function' ? ref.current : null) || internalRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
    const el = internalRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => adjustHeight());
    ro.observe(el);
    return () => ro.disconnect();
  }, [value]);

  return (
    <textarea
      ref={(node) => {
        internalRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
        }
      }}
      rows={minRows}
      value={value ?? ''}
      onChange={(e) => {
        adjustHeight();
        if (onChange) onChange(e);
      }}
      className={className}
      style={{ overflow: 'hidden', resize: 'none', ...style }}
      {...props}
    />
  );
});

AutoResizeTextarea.displayName = 'AutoResizeTextarea';
