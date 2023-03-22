import {
  Alert,
  Select,
  SelectOption,
  SelectOptionObject,
  SelectVariant,
  Spinner,
} from '@patternfly/react-core';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAttributeValueData } from './attribute-value-data';
import { Attribute, Option } from './filter.types';
import { isOption } from './filters-from-params';
import './search-select.css';

interface SearchSelectProps {
  attribute: Attribute;
  variant?: SelectVariant;
  selections?: Set<string>;
  onSelect: (selections: Set<string>) => void;
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
  selections,
  onSelect,
}) => {
  const { t } = useTranslation('plugin__logging-view-plugin');

  const [getOptions, optionsData, error] = useAttributeValueData(attribute);
  const [isOpen, setIsOpen] = React.useState(false);

  const handleClear = () => {
    onSelect(new Set());
  };

  const handleSelect = (
    _e: React.MouseEvent | React.ChangeEvent,
    selectedOption: string | SelectOptionObject,
  ) => {
    const selectedValue = isOption(selectedOption) ? selectedOption.value : String(selectedOption);

    if (selectedValue && selectedValue !== ERROR_VALUE) {
      if (variant === SelectVariant.single || variant === undefined) {
        onSelect(new Set([selectedValue]));
        setIsOpen(false);
      } else {
        const changedSelections = new Set(selections);
        if (changedSelections.has(selectedValue)) {
          changedSelections.delete(selectedValue);
        } else {
          changedSelections.add(selectedValue);
        }

        onSelect(changedSelections);
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
