import {
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Schema } from '../logs.types';
import { TestIds } from '../test-ids';

type SchemaDropdownProps = {
  onSchemaSelected: ((schema: Schema) => void) | undefined;
  schema: Schema;
};

export const SchemaDropdown: React.FC<SchemaDropdownProps> = ({ onSchemaSelected, schema }) => {
  const { t } = useTranslation('plugin__logging-view-plugin');

  const [isOpen, setIsOpen] = React.useState(false);

  const schemaSelectRef = React.useRef<HTMLDivElement>(null);

  const onToggle = () => setIsOpen(!isOpen);
  const onSelect = (
    _: React.MouseEvent<Element, MouseEvent> | undefined,
    value: string | number | undefined,
  ) => {
    if (value != schema) {
      onSchemaSelected?.(value as Schema);
    }
    setIsOpen(false);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (isOpen && !schemaSelectRef.current?.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={onToggle}
      isExpanded={isOpen}
      data-test={TestIds.SchemaToggle}
    >
      {schema}
    </MenuToggle>
  );

  return (
    <div ref={schemaSelectRef}>
      <Select
        id="logging-view-schema-dropdown"
        isOpen={isOpen}
        onSelect={onSelect}
        placeholder={t('Select a Schema')}
        toggle={toggle}
      >
        <SelectList>
          <SelectOption key={'otel'} value={Schema.otel} isSelected={schema === Schema.otel}>
            otel
          </SelectOption>
          <SelectOption key={'viaq'} value={Schema.viaq} isSelected={schema === Schema.viaq}>
            viaq
          </SelectOption>
        </SelectList>
      </Select>
    </div>
  );
};
