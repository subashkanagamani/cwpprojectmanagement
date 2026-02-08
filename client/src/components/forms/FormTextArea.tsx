import { forwardRef, TextareaHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';

interface FormTextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showCharCount?: boolean;
  containerClassName?: string;
}

export const FormTextArea = forwardRef<HTMLTextAreaElement, FormTextAreaProps>(
  ({ label, error, helperText, showCharCount, containerClassName = '', className = '', ...props }, ref) => {
    const textareaId = props.id || props.name || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const currentLength = props.value?.toString().length || 0;
    const maxLength = props.maxLength;

    return (
      <div className={containerClassName}>
        {label && (
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor={textareaId}
              className="block text-sm font-medium text-gray-700"
            >
              {label}
              {props.required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
            </label>
            {showCharCount && maxLength && (
              <span className="text-xs text-gray-500" aria-live="polite">
                {currentLength} / {maxLength}
              </span>
            )}
          </div>
        )}

        <div className="relative">
          <textarea
            ref={ref}
            id={textareaId}
            className={`
              w-full px-3 py-2 border rounded-lg resize-y
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
              transition-colors
              ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'}
              ${className}
            `}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
            {...props}
          />

          {error && (
            <div className="absolute right-3 top-3">
              <AlertCircle className="w-5 h-5 text-red-500" aria-hidden="true" />
            </div>
          )}
        </div>

        {error && (
          <p id={`${textareaId}-error`} className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={`${textareaId}-helper`} className="mt-1 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormTextArea.displayName = 'FormTextArea';
