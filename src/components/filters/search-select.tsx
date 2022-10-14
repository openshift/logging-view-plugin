import {
  Select,
  SelectOption,
  SelectOptionObject,
  SelectVariant,
  Spinner,
} from '@patternfly/react-core';
import React from 'react';
import { useAttributeValueData } from './attribute-value-data';
import { Attribute } from './filter.types';
import { isOption } from './filters-from-params';
import './search-select.css';

interface SearchSelectProps {
  attribute: Attribute;
  variant?: SelectVariant;
  selections?: Set<string>;
  onSelect: (selections: Set<string>) => void;
}

export const SearchSelect: React.FC<SearchSelectProps> = ({
  attribute,
  variant,
  selections,
  onSelect,
}) => {
  const [getOptions, optionsData] = useAttributeValueData(attribute);
  const [isOpen, setIsOpen] = React.useState(false);

  const handleClear = () => {
    onSelect(new Set());
  };

  const handleSelect = (
    _e: React.MouseEvent | React.ChangeEvent,
    selectedOption: string | SelectOptionObject,
  ) => {
    const selectedValue = isOption(selectedOption) ? selectedOption.value : String(selectedOption);

    if (selectedValue) {
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

  const optionComponents = optionsData
    ? optionsData.map((item) => (
        <SelectOption key={item.value} value={item.value}>
          {item.option}
        </SelectOption>
      ))
    : [
        <SelectOption isLoading key="custom-loading" value="loading">
          <Spinner size="lg" />
        </SelectOption>,
      ];

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
        variant={variant}
        onToggle={handleToggle}
        onSelect={handleSelect}
        selections={selections ? Array.from(selections) : []}
        isOpen={isOpen}
        placeholderText={`Filter by ${attribute.name}`}
        aria-labelledby={titleId}
        onFilter={handleFilter}
        onClear={handleClear}
        hasInlineFilter={optionsData && optionsData.length > 10}
        inlineFilterPlaceholderText="Search"
        className="co-logs__search-select"
      >
        {optionComponents}
      </Select>
    </>
  );
};
