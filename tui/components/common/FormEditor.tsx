/**
 * FormEditor Component
 * Multi-field form with Tab navigation and validation
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

// Color constants
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';
const DIM_WHITE = '#9CA3AF';
const GREEN = '#10B981';
const RED = '#EF4444';
const YELLOW = '#F59E0B';
const PURPLE = '#A855F7';

export type FieldType = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox';

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  value: any;
  placeholder?: string;
  required?: boolean;
  options?: FormFieldOption[]; // For select/radio
  rows?: number; // For textarea
  validation?: (value: any) => string | null; // Returns error message or null
  helperText?: string;
}

export interface FormEditorProps {
  title?: string;
  fields: FormField[];
  onSubmit: (values: Record<string, any>) => void;
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
}

export const FormEditor: React.FC<FormEditorProps> = ({
  title,
  fields,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
}) => {
  const [focusedFieldIndex, setFocusedFieldIndex] = useState(0);
  const [values, setValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    fields.forEach((field) => {
      initial[field.name] = field.value;
    });
    return initial;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditingField, setIsEditingField] = useState(false);

  // Handle keyboard input
  useInput((input, key) => {
    // If currently editing a field, only Esc should cancel editing
    if (isEditingField) {
      if (key.escape) {
        setIsEditingField(false);
      }
      return; // Let the input component handle other keys
    }

    // Tab navigation
    if (key.tab && !key.shift) {
      setFocusedFieldIndex((prev) => (prev + 1) % fields.length);
      return;
    }

    if (key.tab && key.shift) {
      setFocusedFieldIndex((prev) => (prev - 1 + fields.length) % fields.length);
      return;
    }

    // Enter to start editing or toggle
    if (key.return) {
      const field = fields[focusedFieldIndex];
      if (!field) return;

      if (field.type === 'text' || field.type === 'textarea') {
        setIsEditingField(true);
      } else if (field.type === 'checkbox') {
        toggleCheckbox(field.name);
      } else if (field.type === 'radio') {
        // Cycle through radio options
        cycleRadioOption(field);
      }
      return;
    }

    // Space to toggle checkbox/radio
    if (input === ' ') {
      const field = fields[focusedFieldIndex];
      if (!field) return;

      if (field.type === 'checkbox') {
        toggleCheckbox(field.name);
      } else if (field.type === 'radio') {
        cycleRadioOption(field);
      }
      return;
    }

    // Escape to cancel
    if (key.escape) {
      onCancel();
      return;
    }

    // Ctrl+S to submit
    if (key.ctrl && input === 's') {
      handleSubmit();
      return;
    }
  });

  const toggleCheckbox = (name: string) => {
    setValues((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const cycleRadioOption = (field: FormField) => {
    if (!field.options) return;
    const currentIndex = field.options.findIndex(opt => opt.value === values[field.name]);
    const nextIndex = (currentIndex + 1) % field.options.length;
    setValues((prev) => ({
      ...prev,
      [field.name]: field.options![nextIndex]!.value,
    }));
  };

  const updateFieldValue = (name: string, value: any) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Validate field
    const field = fields.find((f) => f.name === name);
    if (field?.validation) {
      const error = field.validation(value);
      setErrors((prev) => ({
        ...prev,
        [name]: error || '',
      }));
    }
  };

  const handleSubmit = () => {
    // Validate all fields
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    fields.forEach((field) => {
      if (field.required && !values[field.name]) {
        newErrors[field.name] = 'This field is required';
        hasErrors = true;
      } else if (field.validation) {
        const error = field.validation(values[field.name]);
        if (error) {
          newErrors[field.name] = error;
          hasErrors = true;
        }
      }
    });

    setErrors(newErrors);

    if (!hasErrors) {
      onSubmit(values);
    }
  };

  const renderField = (field: FormField, index: number) => {
    const isFocused = index === focusedFieldIndex;
    const hasError = errors[field.name];
    const fieldValue = values[field.name];

    return (
      <Box key={field.name} flexDirection="column" marginBottom={1}>
        {/* Label */}
        <Box>
          <Text bold={isFocused} color={isFocused ? CYAN : WHITE}>
            {isFocused ? '● ' : '  '}
            {field.label}
            {field.required && (
              <Text color={RED}> *</Text>
            )}
          </Text>
        </Box>

        {/* Field */}
        <Box paddingLeft={4} flexDirection="column">
          {field.type === 'text' && (
            <Box>
              {isEditingField && isFocused ? (
                <TextInput
                  value={fieldValue || ''}
                  onChange={(value) => updateFieldValue(field.name, value)}
                  placeholder={field.placeholder}
                  onSubmit={() => setIsEditingField(false)}
                />
              ) : (
                <Text color={fieldValue ? WHITE : DIM_WHITE}>
                  {fieldValue || field.placeholder || '(empty)'}
                </Text>
              )}
            </Box>
          )}

          {field.type === 'textarea' && (
            <Box flexDirection="column">
              <Text color={DIM_WHITE} dimColor>
                {fieldValue || field.placeholder || '(empty)'}
              </Text>
              {isFocused && (
                <Text color={CYAN} dimColor>
                  (Enter to edit in external editor)
                </Text>
              )}
            </Box>
          )}

          {field.type === 'checkbox' && (
            <Text color={fieldValue ? GREEN : DIM_WHITE}>
              {fieldValue ? '☑' : '☐'} {fieldValue ? 'Enabled' : 'Disabled'}
            </Text>
          )}

          {field.type === 'radio' && field.options && (
            <Box flexDirection="column">
              {field.options.map((option) => {
                const isSelected = fieldValue === option.value;
                return (
                  <Box key={option.value}>
                    <Text color={isSelected ? GREEN : DIM_WHITE}>
                      {isSelected ? '●' : '○'} {option.label}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          )}

          {field.type === 'select' && field.options && (
            <Text color={WHITE}>
              {field.options.find(opt => opt.value === fieldValue)?.label || '(select)'}
            </Text>
          )}

          {/* Helper text */}
          {field.helperText && !hasError && (
            <Text color={DIM_WHITE} dimColor>
              {field.helperText}
            </Text>
          )}

          {/* Error */}
          {hasError && (
            <Text color={RED}>✗ {hasError}</Text>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box flexDirection="column">
      {/* Title */}
      {title && (
        <Box marginBottom={1}>
          <Text bold color={PURPLE}>
            {title}
          </Text>
        </Box>
      )}

      {/* Form */}
      <Box flexDirection="column" borderStyle="single" borderColor={CYAN} paddingX={1} paddingY={1}>
        {fields.map((field, index) => renderField(field, index))}
      </Box>

      {/* Actions hint */}
      <Box marginTop={1}>
        <Text color={DIM_WHITE} dimColor>
          <Text bold color={CYAN}>Tab</Text> Navigate │{' '}
          <Text bold color={CYAN}>Enter</Text> Edit/Toggle │{' '}
          <Text bold color={CYAN}>Ctrl+S</Text> {submitLabel} │{' '}
          <Text bold color={CYAN}>Esc</Text> {cancelLabel}
        </Text>
      </Box>
    </Box>
  );
};
