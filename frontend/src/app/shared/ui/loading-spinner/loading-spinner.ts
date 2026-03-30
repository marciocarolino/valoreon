import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `<span class="spinner" [style.width.px]="size()" [style.height.px]="size()"></span>`,
  styleUrl: './loading-spinner.css',
})
export class LoadingSpinnerComponent {
  size = input(18);
}
