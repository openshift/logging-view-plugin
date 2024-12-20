import {
  Badge,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  TextInput,
  ToolbarLabel,
  ToolbarLabelGroup,
  ToolbarFilter,
  ToolbarGroup,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '../../hooks/useDebounce';
import { TestIds } from '../../test-ids';
import './attribute-filter.css';
import { Attribute, AttributeList, Filters } from './filter.types';
import { SearchSelect } from './search-select';

interface AttributeFilterProps {
  attributeList: AttributeList;
  filters?: Filters;
  onFiltersChange?: (filters: Filters) => void;
  isDisabled?: boolean;
}

export const AttributeFilter: React.FC<AttributeFilterProps> = ({
  attributeList,
  filters = {},
  onFiltersChange,
  isDisabled,
}) => {
  const { t } = useTranslation('plugin__logging-view-plugin');

  const [isAttributeExpanded, setIsAttributeExpanded] = React.useState(false);
  const changeFromInput = React.useRef(false);
  const [textInputValue, setTextInputValue] = React.useState('');
  const debouncedInputValue = useDebounce(textInputValue);
  const [selectedAttributeId, setSelectedAttributeId] = React.useState<string | undefined>(
    attributeList[0]?.id,
  );

  const handleAttributeToggle = () => {
    setIsAttributeExpanded(!isAttributeExpanded);
  };

  const textAttribute = attributeList.find(
    (attr) => attr.id === selectedAttributeId && attr.valueType === 'text',
  );

  React.useEffect(() => {
    if (textAttribute) {
      const [initialText] = filters[textAttribute.id] ?? [];
      changeFromInput.current = false;
      setTextInputValue(initialText ?? '');
    }
  }, [textAttribute, filters]);

  const handleAttributeSelect = (
    _: React.MouseEvent<Element, MouseEvent> | undefined,
    value: string | number | undefined,
  ) => {
    if (typeof value === 'string') {
      setSelectedAttributeId(value);
    }
    setIsAttributeExpanded(false);
  };

  const handleAttributeValueChange = (
    value: Set<string>,
    expandedSelections?: Map<string, Set<string>>,
  ) => {
    if (selectedAttributeId) {
      if (!filters[selectedAttributeId]) {
        filters[selectedAttributeId] = new Set();
      }

      if (expandedSelections) {
        for (const [key, val] of expandedSelections) {
          filters[key] = val;
        }

        onFiltersChange?.(filters);
      } else {
        onFiltersChange?.({
          ...filters,
          [selectedAttributeId]: value,
        });
      }
    }
  };

  React.useEffect(() => {
    const [initialText] = textAttribute ? filters[textAttribute.id] ?? [] : [];
    const filterReset = initialText === undefined && debouncedInputValue === '';

    if (!filterReset && changeFromInput.current) {
      handleAttributeValueChange(
        debouncedInputValue === '' ? new Set() : new Set([debouncedInputValue]),
      );
    }
  }, [debouncedInputValue]);

  const handleDeleteAttributeGroup = (attribute: string) => () => {
    onFiltersChange?.({ ...filters, [attribute]: new Set() });
  };

  const handleDeleteAttributeValue =
    (attribute: string) => (_category: string | ToolbarLabelGroup, chip: string | ToolbarLabel) => {
      filters?.[attribute]?.delete(chip as string);
      onFiltersChange?.({
        ...filters,
        [attribute]: new Set(filters[attribute]),
      });
    };

  const handleInputValueChange = (value: string) => {
    changeFromInput.current = true;
    setTextInputValue(value);
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={handleAttributeToggle}
      isExpanded={isAttributeExpanded}
      isDisabled={isDisabled}
      icon={<FilterIcon />}
      style={
        {
          width: '200px',
        } as React.CSSProperties
      }
    >
      Filter by status
      {attributeList.length > 0 && <Badge isRead>{attributeList.length}</Badge>}
    </MenuToggle>
  );

  const renderAttributeValueComponent = (attribute: Attribute) => {
    switch (attribute.valueType) {
      case 'text': {
        return (
          <TextInput
            key={`text-${attribute.id}`}
            placeholder={t('Search by {{attributeName}}', {
              attributeName: attribute.name,
            })}
            onChange={(_event, value: string) => handleInputValueChange(value)}
            className="co-logs__attribute-filter__text"
            aria-label={t('Search by {{attributeName}}', {
              attributeName: attribute.name,
            })}
            value={textInputValue}
          />
        );
      }
      case 'select':
        return (
          <SearchSelect
            key={`select-${attribute.id}`}
            attribute={attribute}
            onSelect={handleAttributeValueChange}
            filters={filters}
          />
        );
      case 'checkbox-select':
        return (
          <SearchSelect
            key={`checkbox-select-${attribute.id}`}
            attribute={attribute}
            onSelect={handleAttributeValueChange}
            filters={filters}
            isCheckbox={true}
          />
        );
    }
  };

  return (
    <>
      <ToolbarGroup
        variant="filter-group"
        className="co-logs__attribute-filter"
        data-test={TestIds.AttributeFilters}
      >
        <Select
          isOpen={isAttributeExpanded}
          onSelect={handleAttributeSelect}
          placeholder={t('Attribute')}
          toggle={toggle}
        >
          <SelectList>
            {attributeList.map(({ name: label, id }) => (
              <SelectOption key={id} value={id} isSelected={selectedAttributeId === id}>
                {label}
              </SelectOption>
            ))}
          </SelectList>
        </Select>
        {attributeList.map((attribute) => (
          <ToolbarFilter
            key={`toolbar-filter-${attribute.id}`}
            labels={Array.from(filters[attribute.id] ?? [])}
            deleteLabel={handleDeleteAttributeValue(attribute.id)}
            deleteLabelGroup={handleDeleteAttributeGroup(attribute.id)}
            categoryName={attribute.name}
            data-test={'test'}
          >
            {selectedAttributeId === attribute.id && renderAttributeValueComponent(attribute)}
          </ToolbarFilter>
        ))}
      </ToolbarGroup>
    </>
  );
};
