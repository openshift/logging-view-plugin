import React from 'react';
import { useTranslation } from 'react-i18next';
import { TENANTS } from '../tenants';
import { TestIds } from '../test-ids';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';

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

  const onToggle = () => setIsOpen(!isOpen);
  const onSelect = (e?: React.MouseEvent | React.KeyboardEvent) => {
    const tenant = e?.currentTarget.id;
    setIsOpen(false);
    if (tenant) {
      onTenantSelected?.(tenant);
    }
  };

  return (
    <Dropdown
      id="logging-view-tenant-dropdown"
      data-test={TestIds.TenantDropdown}
      isOpen={isOpen}
      onSelect={() => setIsOpen(false)}
      onOpenChange={(isOpenVal: boolean) => setIsOpen(isOpenVal)}
      placeholder={t('Select a tenant')}
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle isDisabled={isDisabled} ref={toggleRef} onClick={onToggle} isExpanded={isOpen}>
          {selectedTenant}
        </MenuToggle>
      )}
    >
      <DropdownList>
        {TENANTS.map((tenant) => (
          <DropdownItem
            ouiaId={tenant}
            onClick={onSelect}
            key={tenant}
            isSelected={selectedTenant === tenant}
          >
            {tenant}
          </DropdownItem>
        ))}
      </DropdownList>
    </Dropdown>
  );
};
