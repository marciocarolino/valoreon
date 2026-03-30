import {
  Component,
  computed,
  ElementRef,
  HostListener,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { AppDropdownOption } from './dropdown-option.model';

@Component({
  selector: 'app-dropdown',
  standalone: true,
  templateUrl: './app-dropdown.component.html',
  styleUrl: './app-dropdown.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppDropdownComponent),
      multi: true,
    },
  ],
})
export class AppDropdownComponent implements ControlValueAccessor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Options (value may be `null` for e.g. “Todas”) */
  options = input.required<AppDropdownOption[]>();

  placeholder = input<string>('Selecione…');
  /** Shown when value is missing from options (e.g. async load) */
  invalid = input(false);
  /** Spinner in trigger */
  pending = input(false);
  inputId = input<string>('');
  ariaLabel = input<string>('');
  /** Stretch to container width (forms) */
  block = input(true);

  /** e.g. list loading — disables trigger without form control */
  disabledAttr = input(false, { alias: 'disabled' });

  protected readonly open = signal(false);
  private readonly disabledFromForm = signal(false);

  protected readonly isDisabled = computed(
    () => this.disabledFromForm() || this.disabledAttr() || this.pending(),
  );

  private value: string | number | null | undefined = undefined;
  private onChange: (v: string | number | null) => void = () => {};
  private touchedFn: () => void = () => {};

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent): void {
    if (!this.open()) return;
    const t = ev.target as Node | null;
    if (t && this.host.nativeElement.contains(t)) return;
    this.open.set(false);
  }

  writeValue(v: string | number | null | undefined): void {
    this.value = v ?? null;
  }

  registerOnChange(fn: (v: string | number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.touchedFn = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabledFromForm.set(disabled);
  }

  protected displayLabel(): string {
    const v = this.value;
    const opts = this.options();
    const found = opts.find(o => this.same(o.value, v));
    if (found) return found.label;
    if (v === null || v === undefined || v === '') return this.placeholder();
    return String(v);
  }

  protected toggle(ev: MouseEvent): void {
    ev.stopPropagation();
    if (this.isDisabled()) return;
    this.open.update(o => !o);
    if (this.open()) this.touchedFn();
  }

  protected select(opt: AppDropdownOption, ev: MouseEvent): void {
    ev.stopPropagation();
    if (opt.disabled || this.isDisabled()) return;
    this.value = opt.value as string | number | null;
    this.onChange(this.value as string | number | null);
    this.touchedFn();
    this.open.set(false);
  }

  protected isSelected(opt: AppDropdownOption): boolean {
    return this.same(opt.value, this.value);
  }

  private same(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;
    return false;
  }

  protected trackOpt(_i: number, o: AppDropdownOption): string | number | null {
    const v = o.value;
    if (v === null) return '__null__';
    if (typeof v === 'number') return v;
    return String(v);
  }
}
