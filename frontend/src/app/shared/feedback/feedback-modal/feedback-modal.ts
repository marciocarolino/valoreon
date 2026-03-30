import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, throwError } from 'rxjs';
import { FeedbackService, FeedbackType } from '../feedback.service';

@Component({
  selector: 'app-feedback-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './feedback-modal.html',
  styleUrl: './feedback-modal.css',
})
export class FeedbackModalComponent {
  private readonly feedbackService = inject(FeedbackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isOpen   = signal(false);
  readonly isSaving = signal(false);
  readonly success  = signal(false);
  readonly error    = signal<string | null>(null);

  type: FeedbackType = 'FEEDBACK';
  message = '';
  email = '';
  emailInvalid = false;

  readonly typeOptions: { value: FeedbackType; label: string }[] = [
    { value: 'FEEDBACK',   label: 'Feedback geral' },
    { value: 'SUGGESTION', label: 'Sugestão'        },
    { value: 'BUG',        label: 'Reportar bug'    },
  ];

  validateEmail(): void {
    if (!this.email.trim()) {
      this.emailInvalid = false;
      return;
    }
    this.emailInvalid = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  open(): void {
    this.type         = 'FEEDBACK';
    this.message      = '';
    this.email        = '';
    this.emailInvalid = false;
    this.error.set(null);
    this.success.set(false);
    this.isSaving.set(false);
    this.isOpen.set(true);
  }

  close(): void {
    if (this.isSaving()) return;
    this.isOpen.set(false);
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close();
    }
  }

  submit(): void {
    if (!this.message.trim() || this.isSaving()) return;

    this.isSaving.set(true);
    this.error.set(null);

    this.feedbackService
      .send({
        type: this.type,
        message: this.message.trim(),
        ...(this.email.trim() ? { email: this.email.trim() } : {}),
      })
      .pipe(
        catchError(err => {
          const msg =
            err?.status === 401
              ? 'Você precisa estar logado para enviar feedback.'
              : (err?.error?.message ?? 'Erro ao enviar. Tente novamente.');
          this.error.set(msg);
          this.isSaving.set(false);
          return throwError(() => err);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.isSaving.set(false);
        this.success.set(true);
        setTimeout(() => this.isOpen.set(false), 2200);
      });
  }
}
