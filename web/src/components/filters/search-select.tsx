import {
  Alert,
  Select,
  SelectOption,
  SelectOptionObject,
  SelectOptionProps,
  SelectVariant,
  Spinner,
} from '@patternfly/react-core';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAttributeValueData } from './attribute-value-data';
import { Attribute, Filters } from './filter.types';
import { isOption } from './filters-from-params';

interface SearchSelectProps {
  attribute: Attribute;
  variant?: SelectVariant;
  onSelect: (selections: Set<string>, expandedSelections?: Map<string, Set<string>>) => void;
  filters: Filters;
  customBadgeTextDependsOnData?: boolean;
}

const ERROR_VALUE = '__attribute_error';
const NO_RESULTS = 'no results';

const createItemId = (value: string) => `select-multi-typeahead-${value.replace(' ', '-')}`;

const sortOptions = (selections: Set<string>) => (a: SelectOptionProps, b: SelectOptionProps) => {
  const aVal = typeof a.value === 'string' ? a.value : '';
  const bVal = typeof b.value === 'string' ? b.value : '';
  const aSelected = selections.has(aVal);
  const bSelected = selections.has(bVal);

  if (aSelected && !bSelected) {
    return -1;
  }
  if (!aSelected && bSelected) {
    return 1;
  }
  if (a.children && b.children) {
    return String(a.children).localeCompare(String(b.children));
  }
  return String(a.value).localeCompare(String(b.value));
};

const getOptionComponents = (
  attributeOptions: SelectOptionProps[],
  attributeError: Error | undefined,
  attributeLoading: boolean,
  selections: Set<string>,
) => {
  if (attributeLoading) {
    return [
      <SelectOption isLoading key="custom-loading" value="loading">
        <Spinner size="lg" />
      </SelectOption>,
    ];
  }

  if (attributeError) {
    return [
      <SelectOption key="error" value={ERROR_VALUE}>
        <Alert
          variant="danger"
          isInline
          isPlain
          title={attributeError.message || String(attributeError)}
        />
      </SelectOption>,
    ];
  }

  const sortedOptions = attributeOptions.sort(sortOptions(selections));

  return sortedOptions.map((attributeOption) => (
    <SelectOption
      key={String(attributeOption.value)}
      value={attributeOption.value}
      isSelected={selections.has(String(attributeOption.value))}
      id={createItemId(String(attributeOption.value))}
    >
      {attributeOption.children ?? attributeOption.value}
    </SelectOption>
  ));
};

export const SearchSelect: React.FC<SearchSelectProps> = ({
  attribute,
  variant,
  onSelect,
  filters,
}) => {
  const { t } = useTranslation('plugin__logging-view-plugin');

  const {
    getAttributeOptions: getOptions,
    attributeOptions,
    attributeError,
    attributeLoading,
  } = useAttributeValueData(attribute);
  const [isOpen, setIsOpen] = React.useState(false);
  const [selections, setSelections] = React.useState<Set<string>>(new Set());
  const [viewableOptions, setViewableOptions] = React.useState<SelectOptionProps[]>([]);

  const [inputValue, setInputValue] = React.useState<string>('');

  const textInputRef = React.useRef<HTMLInputElement>();
  const listRef = React.useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: MouseEvent) => {
    if (isOpen && !listRef.current?.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  React.useEffect(() => {
    window.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  React.useEffect(() => {
    let newSelectOptions: SelectOptionProps[] = attributeOptions.map((attributeOption) => {
      return { ...attributeOption, hasCheckbox: true };
    });
    // Filter menu items based on the text input value when one exists
    if (inputValue) {
      newSelectOptions = newSelectOptions.filter((menuItem) =>
        String(menuItem.value).toLowerCase().includes(inputValue.toLowerCase()),
      );
      // When no options are found after filtering, display 'No results found'
      if (!newSelectOptions.length) {
        newSelectOptions = [
          {
            'aria-disabled': true,
            children: `No results found for "${inputValue}"`,
            value: NO_RESULTS,
          },
        ];
      }
      // Open the menu when the input value changes and the new value is not empty
      if (!isOpen) {
        setIsOpen(true);
      }
    }
    setViewableOptions(newSelectOptions);
  }, [inputValue, attributeOptions]);

  const handleClear = () => {
    setInputValue('');
    setSelections(new Set());
    onSelect(new Set());
    textInputRef?.current?.focus();
  };

  useEffect(() => {
    if (attribute.isItemSelected && attributeOptions) {
      const selectedItems = attributeOptions.filter((item) =>
        attribute.isItemSelected?.(item.value, filters),
      );

      setSelections(new Set(selectedItems.map((item) => item.value)));
    } else {
      setSelections(filters[attribute.id] ?? new Set());
    }
  }, [filters, attributeOptions]);

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
    attributeOptions
      .sort(sortOptions(selections))
      ?.filter((item) => item.option.includes(filterQuery))
      .map((item) => (
        <SelectOption key={item.value} value={item.value}>
          {item.option}
        </SelectOption>
      ));

  const titleId = `attribute-value-selector-${attribute.id}`;

  return (
    <div ref={listRef}>
      <span id={titleId} hidden>
        {attribute.name}
      </span>
      <Select
        variant={attributeError ? 'single' : variant}
        onToggle={handleToggle}
        onSelect={handleSelect}
        selections={selections ? Array.from(selections) : []}
        customBadgeText={
          attribute.isItemSelected ? (attributeOptions !== undefined ? undefined : '*') : undefined
        }
        isCreateSelectOptionObject
        isOpen={isOpen}
        placeholderText={t('Filter by {{attributeName}}', {
          attributeName: attribute.name,
        })}
        aria-labelledby={titleId}
        onFilter={handleFilter}
        onClear={handleClear}
        hasInlineFilter={attributeOptions && attributeOptions.length > 10}
        inlineFilterPlaceholderText={t('Search')}
        className="co-logs__search-select"
      >
        {getOptionComponents(viewableOptions, attributeError, attributeLoading, selections)}
      </Select>
    </div>
  );
};
