import {
  Alert,
  Badge,
  Button,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  SelectOptionProps,
  Spinner,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TestIds } from '../../test-ids';
import { useAttributeValueData } from './attribute-value-data';
import { Attribute, Filters } from './filter.types';
import { isOption } from './filters-from-params';

interface SearchSelectProps {
  attribute: Attribute;
  onSelect: (selections: Set<string>, expandedSelections?: Map<string, Set<string>>) => void;
  filters: Filters;
  customBadgeTextDependsOnData?: boolean;
  isCheckbox?: boolean;
  tenant?: string;
}

const ERROR_VALUE = '__attribute_error';
const NO_RESULTS = 'no results';

const createItemId = (value: string) => `select-multi-typeahead-${value.replace(' ', '-')}`;

const getOptionComponents = (
  attributeOptions: SelectOptionProps[],
  attributeError: Error | undefined,
  attributeLoading: boolean,
  selections: Array<string>,
  focusedItemIndex: number | null,
  onInputKeyDown: (event: React.KeyboardEvent) => void,
) => {
  if (attributeLoading) {
    return [
      <SelectOption isLoading key="custom-loading" value="loading" hasCheckbox={false}>
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

  const sortedOptions = attributeOptions.sort((a, b) => {
    const aSelected = selections.includes(a.value);
    const bSelected = selections.includes(b.value);

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
  });

  return sortedOptions.map((attributeOption, index) => (
    <SelectOption
      key={attributeOption.value || attributeOption.children}
      value={attributeOption.value}
      hasCheckbox={attributeOption.hasCheckbox}
      isSelected={selections.includes(attributeOption.value)}
      isFocused={focusedItemIndex === index}
      id={createItemId(attributeOption.value)}
      onKeyDown={onInputKeyDown}
    >
      {attributeOption.children ?? attributeOption.value}
    </SelectOption>
  ));
};

export const SearchSelect: React.FC<SearchSelectProps> = ({
  attribute,
  onSelect,
  filters,
  isCheckbox = false,
  tenant,
}) => {
  const { t } = useTranslation('plugin__logging-view-plugin');

  const { getAttributeOptions, attributeOptions, attributeError, attributeLoading } =
    useAttributeValueData(attribute);
  const [selections, setSelections] = React.useState<Array<string>>([]);
  const [viewableOptions, setViewableOptions] = React.useState<SelectOptionProps[]>([]);

  const [isOpen, setIsOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState<string>('');
  const [focusedItemIndex, setFocusedItemIndex] = React.useState<number | null>(null);
  const [activeItemId, setActiveItemId] = React.useState<string | null>(null);

  const textInputRef = React.useRef<HTMLInputElement>();
  const listRef = React.useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: MouseEvent) => {
    if (isOpen && !listRef.current?.contains(event.target as Node)) {
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
            isAriaDisabled: true,
            children: `${t('No results found for')} "${inputValue}"`,
            value: NO_RESULTS,
            hasCheckbox: false,
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

  const setActiveAndFocusedItem = (itemIndex: number) => {
    setFocusedItemIndex(itemIndex);
    const focusedItem = viewableOptions[itemIndex];
    setActiveItemId(createItemId(focusedItem.value));
  };

  const handleClear = () => {
    setInputValue('');
    resetActiveAndFocusedItem();
    textInputRef?.current?.focus();
  };

  useEffect(() => {
    if (attribute.isItemSelected) {
      const selectedItems = attributeOptions.filter((item) =>
        attribute.isItemSelected?.(item.value, filters),
      );

      setSelections(selectedItems.map((item) => item.value));
    } else {
      setSelections(Array.from(filters[attribute.id] ?? []));
    }
  }, [filters, attributeOptions]);

  const handleSelect = (
    _: React.MouseEvent<Element, MouseEvent> | undefined,
    value: string | number | undefined,
  ) => {
    const selectedValue = isOption(value) ? value.value : String(value);

    let expandedFilters: Map<string, Set<string>> | undefined = undefined;

    if (selectedValue && selectedValue !== ERROR_VALUE) {
      if (!isCheckbox) {
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

  const onToggleClick = () => {
    setIsOpen(!isOpen);
    textInputRef?.current?.focus();
  };

  React.useEffect(() => {
    getAttributeOptions();
  }, [tenant]);

  const resetActiveAndFocusedItem = () => {
    setFocusedItemIndex(null);
    setActiveItemId(null);
  };

  const closeMenu = () => {
    setIsOpen(false);
    resetActiveAndFocusedItem();
  };

  const onInputClick = () => {
    if (!isOpen) {
      setIsOpen(true);
    } else if (!inputValue) {
      closeMenu();
    }
  };

  const onInputKeyDown = (event: React.KeyboardEvent) => {
    const focusedItem = focusedItemIndex !== null ? viewableOptions[focusedItemIndex] : null;
    const keypress = event.key;

    if (keypress === 'Enter') {
      if (isOpen && focusedItem && focusedItem.value !== NO_RESULTS) {
        handleSelect(undefined, focusedItem.value);
      } else if (!isOpen) {
        setIsOpen(true);
      }
      return;
    }

    let indexToFocus = 0;
    if (!isOpen) {
      setIsOpen(true);
    }

    if (keypress === 'ArrowUp') {
      event.preventDefault();
      // When no index is set or at the first index, focus to the last
      // otherwise decrement focus index
      if (focusedItemIndex === null || focusedItemIndex === 0) {
        indexToFocus = viewableOptions.length - 1;
      } else {
        indexToFocus = focusedItemIndex - 1;
      }
      setActiveAndFocusedItem(indexToFocus);
    } else if (keypress === 'ArrowDown') {
      event.preventDefault();
      // When no index is set or at the last index, focus to the first,
      // otherwise increment focus index
      if (focusedItemIndex === null || focusedItemIndex === viewableOptions.length - 1) {
        indexToFocus = 0;
      } else {
        indexToFocus = focusedItemIndex + 1;
      }
      setActiveAndFocusedItem(indexToFocus);
    }
  };

  const onTextInputChange = (_event: React.FormEvent<HTMLInputElement>, value: string) => {
    setInputValue(value);
    resetActiveAndFocusedItem();
  };

  const titleId = `attribute-value-selector-${attribute.id}`;

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      variant="typeahead"
      ref={toggleRef}
      onClick={onToggleClick}
      isExpanded={isOpen}
      data-test={TestIds.AttributeOptions}
      style={
        {
          width: '230px',
          alignItems: 'center',
        } as React.CSSProperties
      }
      key={`attribute-toggle-${attribute.id}`}
      className="lv-plugin__typeahead-toggle"
      badge={!attributeLoading && <Badge isRead>{selections.length}</Badge>}
    >
      <TextInputGroup isPlain>
        <TextInputGroupMain
          value={inputValue}
          onClick={onInputClick}
          onChange={onTextInputChange}
          onKeyDown={onInputKeyDown}
          id="attribute-typeahead-multiselect"
          autoComplete="off"
          innerRef={textInputRef}
          placeholder={t('Filter by {{attributeName}}', {
            attributeName: attribute.name,
          })}
          {...(activeItemId && { 'aria-activedescendant': activeItemId })}
          role="combobox"
          isExpanded={isOpen}
          aria-controls="select-multi-typeahead-checkbox-listbox"
        />
        {inputValue.length > 0 && (
          <TextInputGroupUtilities>
            <Button variant="plain" onClick={handleClear} aria-label="Clear input value">
              <TimesIcon aria-hidden />
            </Button>
          </TextInputGroupUtilities>
        )}
      </TextInputGroup>
    </MenuToggle>
  );

  return (
    <div ref={listRef}>
      <span id={titleId} hidden>
        {attribute.name}
      </span>
      <Select
        onSelect={handleSelect}
        isOpen={isOpen}
        placeholder={t('Filter by {{attributeName}}', {
          attributeName: attribute.name,
        })}
        aria-labelledby={titleId}
        aria-placeholder={t('Search')}
        className="lv-plugin__search-select"
        toggle={toggle}
        maxMenuHeight="300px"
      >
        <SelectList
          isAriaMultiselectable
          key={`select-list-${attribute.id}-${viewableOptions.length}`}
        >
          {getOptionComponents(
            viewableOptions,
            attributeError,
            attributeLoading,
            selections,
            focusedItemIndex,
            onInputKeyDown,
          )}
        </SelectList>
      </Select>
    </div>
  );
};
