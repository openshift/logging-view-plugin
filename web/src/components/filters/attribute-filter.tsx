import {
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
import {
  CSSProperties,
  FC,
  MouseEvent as ReactMouseEvent,
  Ref,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
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
  tenant?: string;
}

export const AttributeFilter: FC<AttributeFilterProps> = ({
  attributeList,
  filters = {},
  onFiltersChange,
  isDisabled,
  tenant,
}) => {
  const { t } = useTranslation('plugin__logging-view-plugin');

  const [isAttributeExpanded, setIsAttributeExpanded] = useState(false);
  const changeFromInput = useRef(false);
  const [textInputValue, setTextInputValue] = useState('');
  const debouncedInputValue = useDebounce(textInputValue);
  const [selectedAttributeId, setSelectedAttributeId] = useState<string | undefined>(
    attributeList[0]?.id,
  );
  const selectRef = useRef<HTMLDivElement>(null);

  const handleAttributeToggle = () => {
    setIsAttributeExpanded(!isAttributeExpanded);
  };

  const textAttribute = attributeList.find(
    (attr) => attr.id === selectedAttributeId && attr.valueType === 'text',
  );

  useEffect(() => {
    if (textAttribute) {
      const [initialText] = filters[textAttribute.id] ?? [];
      changeFromInput.current = false;
      setTextInputValue(initialText ?? '');
    }
  }, [textAttribute, filters]);

  useEffect(() => {
    // Audit tenant has only the content attribute
    if (tenant === 'audit') {
      setSelectedAttributeId(attributeList[0]?.id);
    }
  }, [tenant, attributeList]);

  useEffect(() => {
    if (!selectedAttributeId) {
      setSelectedAttributeId(attributeList[0]?.id);
    }
  }, [attributeList, selectedAttributeId]);

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (isAttributeExpanded && !selectRef.current?.contains(event.target as Node)) {
        setIsAttributeExpanded(false);
      }
    },
    [isAttributeExpanded, setIsAttributeExpanded],
  );

  useEffect(() => {
    if (isAttributeExpanded) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, [isAttributeExpanded, handleClickOutside]);

  const handleAttributeSelect = (
    _: ReactMouseEvent<Element, MouseEvent> | undefined,
    value: string | number | undefined,
  ) => {
    if (typeof value === 'string') {
      setSelectedAttributeId(value);
    }
    setIsAttributeExpanded(false);
  };

  const handleAttributeValueChange = useCallback(
    (value: Set<string>, expandedSelections?: Map<string, Set<string>>) => {
      const newFilters = { ...filters };
      if (selectedAttributeId) {
        if (!newFilters[selectedAttributeId]) {
          newFilters[selectedAttributeId] = new Set();
        }

        if (expandedSelections) {
          for (const [key, val] of expandedSelections) {
            newFilters[key] = val;
          }

          onFiltersChange?.(newFilters);
        } else {
          onFiltersChange?.({
            ...newFilters,
            [selectedAttributeId]: value,
          });
        }
      }
    },
    [filters, selectedAttributeId, onFiltersChange],
  );

  useEffect(() => {
    const [initialText] = textAttribute ? (filters[textAttribute.id] ?? []) : [];
    const filterReset = initialText === undefined && debouncedInputValue === '';

    if (!filterReset && changeFromInput.current) {
      handleAttributeValueChange(
        debouncedInputValue === '' ? new Set() : new Set([debouncedInputValue]),
      );
    }
  }, [debouncedInputValue, filters, handleAttributeValueChange, textAttribute]);

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

  const toggle = (toggleRef: Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={handleAttributeToggle}
      isExpanded={isAttributeExpanded}
      isDisabled={isDisabled}
      icon={<FilterIcon />}
      data-test={TestIds.AvailableAttributes}
      style={
        {
          width: '240px',
        } as CSSProperties
      }
    >
      {attributeList.find((attribute) => attribute.id === selectedAttributeId)?.name ??
        t('Attribute')}
    </MenuToggle>
  );

  const namespaces = filters['namespace'] ? Array.from(filters['namespace']) : [];
  const namespacesKey = namespaces.sort().join('-');

  const renderAttributeValueComponent = (attribute: Attribute) => {
    switch (attribute.valueType) {
      case 'text': {
        return (
          <TextInput
            key={`text-${attribute.id}-${namespacesKey}`}
            placeholder={t('Search by {{attributeName}}', {
              attributeName: attribute.name,
            })}
            onChange={(_event, value: string) => handleInputValueChange(value)}
            className="lv-plugin__attribute-filter__text"
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
            key={`select-${attribute.id}-${namespacesKey}`}
            attribute={attribute}
            onSelect={handleAttributeValueChange}
            filters={filters}
            tenant={tenant}
          />
        );
      case 'checkbox-select':
        return (
          <SearchSelect
            key={`checkbox-select-${attribute.id}-${namespacesKey}`}
            attribute={attribute}
            onSelect={handleAttributeValueChange}
            filters={filters}
            isCheckbox={true}
            tenant={tenant}
          />
        );
    }
  };

  return (
    <>
      <ToolbarGroup
        variant="filter-group"
        className="lv-plugin__attribute-filter"
        data-test={TestIds.AttributeFilters}
      >
        <div ref={selectRef}>
          <Select
            selected={selectedAttributeId}
            onSelect={handleAttributeSelect}
            isOpen={isAttributeExpanded}
            onOpenChange={setIsAttributeExpanded}
            toggle={toggle}
          >
            <SelectList>
              {attributeList.map((attribute) => {
                return (
                  <SelectOption key={attribute.id} value={attribute.id}>
                    {attribute.name}
                  </SelectOption>
                );
              })}
            </SelectList>
          </Select>
        </div>
        {attributeList.map((attribute) => (
          <ToolbarFilter
            key={`toolbar-filter-${attribute.id}`}
            labels={Array.from(filters[attribute.id] ?? [])}
            deleteLabel={handleDeleteAttributeValue(attribute.id)}
            deleteLabelGroup={handleDeleteAttributeGroup(attribute.id)}
            categoryName={attribute.name}
          >
            {selectedAttributeId === attribute.id && renderAttributeValueComponent(attribute)}
          </ToolbarFilter>
        ))}
      </ToolbarGroup>
    </>
  );
};
