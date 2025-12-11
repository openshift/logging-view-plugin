import React from 'react';
import { useTranslation } from 'react-i18next';
import { TENANTS } from '../tenants';
import { TestIds } from '../test-ids';
import {
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';
import { isOption } from './filters/filters-from-params';

interface TenantDropdownProps {
  selectedTenant?: string;
  onTenantSelected?: (tenant: string) => void;
  isDisabled?: boolean;
}

export const TenantDropdown: React.FC<TenantDropdownProps> = ({
  selectedTenant,
  onTenantSelected,
  isDisabled = false,
}) => {
  const { t } = useTranslation('plugin__logging-view-plugin');

  const [isOpen, setIsOpen] = React.useState(false);

  const selectRef = React.useRef<HTMLDivElement>(null);

  const onToggle = () => setIsOpen(!isOpen);
  const onSelect = (
    _: React.MouseEvent<Element, MouseEvent> | undefined,
    value: string | number | undefined,
  ) => {
    const selectedValue = isOption(value) ? value.value : String(value);
    setIsOpen(false);
    if (selectedValue) {
      onTenantSelected?.(selectedValue);
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (isOpen && !selectRef.current?.contains(event.target as Node)) {
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
      isDisabled={isDisabled}
      ref={toggleRef}
      onClick={onToggle}
      isExpanded={isOpen}
      data-test={TestIds.TenantToggle}
    >
      {selectedTenant}
    </MenuToggle>
  );

  return (
    <div ref={selectRef}>
      <Select
        id="logging-view-tenant-dropdown"
        isOpen={isOpen}
        onSelect={onSelect}
        placeholder={t('Select a tenant')}
        toggle={toggle}
      >
        <SelectList>
          {TENANTS.map((tenant) => (
            <SelectOption key={tenant} value={tenant} isSelected={selectedTenant === tenant}>
              {tenant}
            </SelectOption>
          ))}
        </SelectList>
      </Select>
    </div>
  );
};
