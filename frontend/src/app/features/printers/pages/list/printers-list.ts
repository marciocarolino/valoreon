import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, throwError } from 'rxjs';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PrinterService } from '../../services/printer.service';
import { Printer, PrinterStatus } from '../../models/printer.model';
import { AppDropdownComponent } from '../../../../shared/ui/dropdown/app-dropdown.component';

@Component({
  selector: 'app-printers-list',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, DecimalPipe, RouterLink, AppDropdownComponent],
  templateUrl: './printers-list.html',
  styleUrl: './printers-list.css',
})
export class PrintersListComponent implements OnInit {
  private readonly printerService = inject(PrinterService);
  private readonly router         = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly printers = signal<Printer[]>([]);
  readonly isLoadingList = signal(false);
  readonly listError = signal<string | null>(null);
  readonly changingStatusId  = signal<number | null>(null);

  readonly statusOptions: { value: PrinterStatus; label: string }[] = [
    { value: 'ACTIVE',      label: 'Ativa'       },
    { value: 'INACTIVE',    label: 'Inativa'     },
    { value: 'MAINTENANCE', label: 'Manutenção'  },
  ];

  readonly modalOpen = signal(false);
  readonly isSaving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly estimatedCost = signal(0);

  readonly form = this.fb.group({
    name:                  ['',                       [Validators.required, Validators.minLength(2)]],
    brand:                 ['',                       [Validators.required]],
    powerConsumptionWatts: [null as number | null,    [Validators.required, Validators.min(1)]],
    energyCostPerKwh:      [null as number | null,    [Validators.required, Validators.min(0.01)]],
  });

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const { powerConsumptionWatts: w, energyCostPerKwh: k } = this.form.getRawValue();
        this.estimatedCost.set(((w ?? 0) / 1000) * (k ?? 0));
      });
  }

  ngOnInit(): void {
    this.loadPrinters();
  }

  loadPrinters(): void {
    this.isLoadingList.set(true);
    this.listError.set(null);

    this.printerService
      .getPrinters()
      .pipe(
        catchError(err => {
          this.listError.set('Não foi possível carregar as impressoras.');
          this.isLoadingList.set(false);
          return throwError(() => err);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(data => {
        this.printers.set(data);
        this.isLoadingList.set(false);
      });
  }

  openModal(): void {
    this.form.reset({ name: '', brand: '', powerConsumptionWatts: null, energyCostPerKwh: null });
    this.formError.set(null);
    this.estimatedCost.set(0);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    if (this.isSaving()) return;
    this.modalOpen.set(false);
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeModal();
    }
  }

  savePrinter(): void {
    if (this.form.invalid || this.isSaving()) return;

    const { name, brand, powerConsumptionWatts, energyCostPerKwh } = this.form.getRawValue();
    const duplicate = this.printers().some(
      p => p.name.trim().toLowerCase() === name!.trim().toLowerCase(),
    );
    if (duplicate) {
      this.formError.set('Já existe uma impressora com esse nome.');
      return;
    }

    this.isSaving.set(true);
    this.formError.set(null);
    this.printerService
      .createPrinter({ name: name!, brand: brand!, powerConsumptionWatts: powerConsumptionWatts!, energyCostPerKwh: energyCostPerKwh! })
      .pipe(
        catchError(err => {
          const msg = err?.error?.message ?? 'Erro ao salvar impressora. Tente novamente.';
          this.formError.set(msg);
          this.isSaving.set(false);
          return throwError(() => err);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(newPrinter => {
        this.printers.update(list => [...list, newPrinter]);
        this.isSaving.set(false);
        this.modalOpen.set(false);
      });
  }

  getStatusLabel(status: PrinterStatus): string {
    const labels: Record<PrinterStatus, string> = {
      ACTIVE:      'Ativa',
      INACTIVE:    'Inativa',
      MAINTENANCE: 'Manutenção',
    };
    return labels[status] ?? status;
  }

  getStatusClass(status: PrinterStatus): string {
    const classes: Record<PrinterStatus, string> = {
      ACTIVE:      'status-green',
      INACTIVE:    'status-red',
      MAINTENANCE: 'status-yellow',
    };
    return classes[status] ?? '';
  }

  onPrinterStatusChange(printer: Printer, newStatus: PrinterStatus): void {
    if (newStatus === printer.status || this.changingStatusId() !== null) return;

    if (newStatus === 'MAINTENANCE') {
      this.router.navigate(['/impressoras/manutencao'], {
        queryParams: { printerId: printer.id },
      });
      return;
    }

    this.changingStatusId.set(printer.id);
    this.listError.set(null);

    this.printerService
      .updateStatus(printer, newStatus)
      .pipe(
        catchError(err => {
          const msg = err?.error?.message ?? 'Erro ao atualizar status da impressora.';
          this.listError.set(msg);
          this.changingStatusId.set(null);
          return throwError(() => err);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(updated => {
        this.printers.update(list =>
          list.map(p => p.id === updated.id ? updated : p),
        );
        this.changingStatusId.set(null);
      });
  }
}
