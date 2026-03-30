export interface AppDropdownOption<T = string | number | null> {
  label: string;
  value: T;
  disabled?: boolean;
}
