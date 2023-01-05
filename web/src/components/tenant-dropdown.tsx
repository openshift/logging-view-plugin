import { OptionsMenu, OptionsMenuItem, OptionsMenuToggle } from '@patternfly/react-core';
import React from 'react';
import { TestIds } from '../test-ids';

interface TenantDropdownProps {
  selectedTenant?: string;
  onTenantSelected?: (tenant: string) => void;
  isDisabled?: boolean;
}

const tenants = ['application', 'infrastructure', 'audit'];

export const TenantDropdown: React.FC<TenantDropdownProps> = ({
  selectedTenant,
  onTenantSelected,
  isDisabled = false,
}) => {
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
    <OptionsMenu
      id="logging-view-tenant-dropdown"
      data-test={TestIds.TenantDropdown}
      disabled={isDisabled}
      menuItems={tenants.map((tenant) => (
        <OptionsMenuItem
          onSelect={onSelect}
          isSelected={selectedTenant === tenant}
          key={tenant}
          id={tenant}
        >
          {tenant}
        </OptionsMenuItem>
      ))}
      isOpen={isOpen}
      toggle={
        <OptionsMenuToggle
          isDisabled={isDisabled}
          onToggle={onToggle}
          toggleTemplate={selectedTenant ?? 'Select a tenant'}
        />
      }
    />
  );
};
