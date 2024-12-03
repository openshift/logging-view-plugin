import {
  Alert,
  Select,
  SelectOption,
  SelectOptionObject,
  SelectVariant,
  Spinner,
} from '@patternfly/react-core';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAttributeValueData } from './attribute-value-data';
import { Attribute, Filters, Option } from './filter.types';
import { isOption } from './filters-from-params';
import './search-select.css';

interface SearchSelectProps {
  attribute: Attribute;
  variant?: SelectVariant;
  onSelect: (selections: Set<string>, expandedSelections?: Map<string, Set<string>>) => void;
  filters: Filters;
  customBadgeTextDependsOnData?: boolean;
}

const ERROR_VALUE = '__attribute_error';

const getOptionComponents = (optionsData: Option[] | undefined, error: Error | undefined) => {
  if (error) {
    return [
      <SelectOption key="error" value={ERROR_VALUE}>
        <Alert variant="danger" isInline isPlain title={error.message || String(error)} />
      </SelectOption>,
    ];
  }

  if (optionsData) {
    return optionsData.map((item) => (
      <SelectOption key={item.value} value={item.value}>
        {item.option}
      </SelectOption>
    ));
  }

  return [
    <SelectOption isLoading key="custom-loading" value="loading">
      <Spinner size="lg" />
    </SelectOption>,
  ];
};

export const SearchSelect: React.FC<SearchSelectProps> = ({
  attribute,
  variant,
  onSelect,
  filters,
}) => {
  const { t } = useTranslation('plugin__logging-view-plugin');

  const [getOptions, optionsData, error] = useAttributeValueData(attribute);
  const [isOpen, setIsOpen] = React.useState(false);
  const [selections, setSelections] = React.useState<Set<string>>(new Set());

  const handleClear = () => {
    onSelect(new Set());
  };

  useEffect(() => {
    if (attribute.isItemSelected && optionsData) {
      const selectedItems = optionsData.filter((item) =>
        attribute.isItemSelected?.(item.value, filters),
      );

      setSelections(new Set(selectedItems.map((item) => item.value)));
    } else {
      setSelections(filters[attribute.id] ?? new Set());
    }
  }, [filters, optionsData]);

  const handleSelect = (
    _e: React.MouseEvent | React.ChangeEvent,
    selectedOption: string | SelectOptionObject,
  ) => {
    const selectedValue = isOption(selectedOption) ? selectedOption.value : String(selectedOption);

    let expandedFilters: Map<string, Set<string>> | undefined = undefined;

    if (selectedValue && selectedValue !== ERROR_VALUE) {
      if (variant === SelectVariant.single || variant === undefined) {
        expandedFilters = attribute.expandSelection
          ? attribute.expandSelection(new Set([selectedValue]))
          : undefined;

        onSelect(new Set([selectedValue]), expandedFilters);
        setIsOpen(false);
      } else {
        const changedSelections = new Set(selections);
        if (changedSelections.has(selectedValue)) {
          changedSelections.delete(selectedValue);

          expandedFilters = attribute.expandSelection
            ? attribute.expandSelection(changedSelections)
            : undefined;
        } else {
          changedSelections.add(selectedValue);

          expandedFilters = attribute.expandSelection
            ? attribute.expandSelection(changedSelections)
            : undefined;
        }

        onSelect(changedSelections, expandedFilters);
      }
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  React.useEffect(() => {
    getOptions();
  }, []);

  const handleFilter = (
    _e: React.ChangeEvent<HTMLInputElement> | null,
    filterQuery: string,
  ): React.ReactElement[] | undefined =>
    optionsData
      ?.filter((item) => item.option.includes(filterQuery))
      .map((item) => (
        <SelectOption key={item.value} value={item.value}>
          {item.option}
        </SelectOption>
      ));

  const titleId = `attribute-value-selector-${attribute.id}`;

  return (
    <>
      <span id={titleId} hidden>
        {attribute.name}
      </span>
      <Select
        variant={error ? 'single' : variant}
        onToggle={handleToggle}
        onSelect={handleSelect}
        selections={selections ? Array.from(selections) : []}
        customBadgeText={
          attribute.isItemSelected ? (optionsData !== undefined ? undefined : '*') : undefined
        }
        isCreateSelectOptionObject
        isOpen={isOpen}
        placeholderText={t('Filter by {{attributeName}}', {
          attributeName: attribute.name,
        })}
        aria-labelledby={titleId}
        onFilter={handleFilter}
        onClear={handleClear}
        hasInlineFilter={optionsData && optionsData.length > 10}
        inlineFilterPlaceholderText={t('Search')}
        className="co-logs__search-select"
      >
        {getOptionComponents(optionsData, error)}
      </Select>
    </>
  );
};
