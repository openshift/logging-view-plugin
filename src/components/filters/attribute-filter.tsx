import {
  Select,
  SelectOption,
  SelectOptionObject,
  SelectVariant,
  TextInput,
  ToolbarChip,
  ToolbarChipGroup,
  ToolbarFilter,
  ToolbarGroup,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import React from 'react';
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
  const [isAttributeExpanded, setIsAttributeExpanded] = React.useState(false);
  const changeFromInput = React.useRef(false);
  const [textInputValue, setTextInputValue] = React.useState('');
  const debouncedInputValue = useDebounce(textInputValue);
  const [selectedAttributeId, setSelectedAttributeId] = React.useState<
    string | undefined
  >(attributeList[0]?.id);

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
    _: React.MouseEvent | React.ChangeEvent,
    value: string | SelectOptionObject,
  ) => {
    if (typeof value === 'string') {
      setSelectedAttributeId(value);
    }
    setIsAttributeExpanded(false);
  };

  const handleAttributeValueChange = (value: Set<string>) => {
    if (selectedAttributeId) {
      if (!filters[selectedAttributeId]) {
        filters[selectedAttributeId] = new Set();
      }

      onFiltersChange?.({
        ...filters,
        [selectedAttributeId]: value,
      });
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
    (attribute: string) =>
    (_category: string | ToolbarChipGroup, chip: string | ToolbarChip) => {
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

  const renderAttributeValueComponent = (attribute: Attribute) => {
    switch (attribute.valueType) {
      case 'text': {
        return (
          <TextInput
            key={`text-${attribute.id}`}
            placeholder={`Search by ${attribute.name}`}
            onChange={handleInputValueChange}
            className="co-logs__attribute-filter__text"
            iconVariant="search"
            aria-label={`Search by ${attribute.name}`}
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
            selections={filters[attribute.id]}
          />
        );
      case 'checkbox-select':
        return (
          <SearchSelect
            key={`checkbox-select-${attribute.id}`}
            attribute={attribute}
            variant={SelectVariant.checkbox}
            onSelect={handleAttributeValueChange}
            selections={filters[attribute.id]}
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
          onToggle={handleAttributeToggle}
          isOpen={isAttributeExpanded}
          onSelect={handleAttributeSelect}
          placeholderText="Attribute"
          isDisabled={isDisabled}
          selections={selectedAttributeId}
          toggleIcon={<FilterIcon />}
        >
          {attributeList.map(({ name: label, id }) => (
            <SelectOption key={id} value={id}>
              {label}
            </SelectOption>
          ))}
        </Select>
        {attributeList.map((attribute) => (
          <ToolbarFilter
            key={`toolbar-filter-${attribute.id}`}
            chips={Array.from(filters[attribute.id] ?? [])}
            deleteChip={handleDeleteAttributeValue(attribute.id)}
            deleteChipGroup={handleDeleteAttributeGroup(attribute.id)}
            categoryName={attribute.name}
            data-test={'test'}
          >
            {selectedAttributeId === attribute.id &&
              renderAttributeValueComponent(attribute)}
          </ToolbarFilter>
        ))}
      </ToolbarGroup>
    </>
  );
};
