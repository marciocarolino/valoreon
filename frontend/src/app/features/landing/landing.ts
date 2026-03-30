import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { ProfitPreviewComponent } from './profit-preview/profit-preview';
import { FeedbackModalComponent } from '../../shared/feedback/feedback-modal/feedback-modal';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, ProfitPreviewComponent, FeedbackModalComponent],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class LandingComponent {
  readonly themeService = inject(ThemeService);

  readonly benefits = [
    {
      icon: 'cost',
      title: 'Controle de Custos',
      desc: 'Saiba exatamente quanto custa cada peça que você produz.',
    },
    {
      icon: 'printer',
      title: 'Gestão de Impressoras',
      desc: 'Nunca deixe uma impressora parada sem perceber.',
    },
    {
      icon: 'profit',
      title: 'Lucro em Tempo Real',
      desc: 'Acompanhe seu lucro crescer (ou cair) em tempo real.',
    },
    {
      icon: 'reports',
      title: 'Relatórios Detalhados',
      desc: 'Tome decisões com segurança usando dados reais.',
    },
  ];
}
