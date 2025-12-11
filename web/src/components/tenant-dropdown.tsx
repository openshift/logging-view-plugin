import { OptionsMenu, OptionsMenuItem, OptionsMenuToggle } from '@patternfly/react-core';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TENANTS } from '../tenants';
import { TestIds } from '../test-ids';

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
  const onSelect = (e?: React.MouseEvent | React.KeyboardEvent) => {
    const tenant = e?.currentTarget.id;
    setIsOpen(false);
    if (tenant) {
      onTenantSelected?.(tenant);
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

  return (
    <div ref={selectRef}>
      <OptionsMenu
        id="logging-view-tenant-dropdown"
        data-test={TestIds.TenantDropdown}
        disabled={isDisabled}
        menuItems={TENANTS.map((tenant) => (
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
            toggleTemplate={selectedTenant ?? t('Select a tenant')}
          />
        }
      />
    </div>
  );
};
