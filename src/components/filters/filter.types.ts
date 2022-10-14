export type Filters = Partial<Record<string, Set<string>>>;

export type Option = { option: string; value: string };

export type Attribute = {
  label?: string;
  name: string;
  id: string;
  options?: Array<Option> | ((searchQuery?: string) => Promise<Array<Option>>);
  valueType: 'text' | 'select' | 'checkbox-select';
};

export type AttributeList = Array<Attribute>;
