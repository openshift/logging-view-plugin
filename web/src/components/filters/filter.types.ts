export type Filters = Partial<Record<string, Set<string>>>;

export type Option = { option: string; value: string };

export type OnPartialOptions = (options: Array<Option>) => void;

export type Attribute = {
  label?: string;
  name: string;
  id: string;
  // Async options resolve with the complete list. Sources that aggregate several
  // requests may also call onPartial with intermediate results as they arrive.
  options?:
    Array<Option> | ((filters?: Filters, onPartial?: OnPartialOptions) => Promise<Array<Option>>);
  valueType: 'text' | 'select' | 'checkbox-select';
  // upon selection of an option, this function is called to expand filters into other attributes
  expandSelection?: (value: Set<string>) => Map<string, Set<string>>;
  // determines if an option is selected based on other filters
  isItemSelected?: (value: string, filters: Filters) => boolean;
  emptyStateMessage?: ((filters: Filters) => string) | string;
};

export type AttributeList = Array<Attribute>;
