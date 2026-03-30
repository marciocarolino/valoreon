import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface ChannelProfit {
  name: string;
  fee: string;
  profit: string;
  best: boolean;
  shippingProfit: string;
  shippingNegative: boolean;
  shippingDetail: string;
}

interface ProfitItem {
  icon: string;
  name: string;
  cost: string;
  sale: string;
  profit: string;
  channels: ChannelProfit[];
}

@Component({
  selector: 'app-profit-preview',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './profit-preview.html',
  styleUrl: './profit-preview.css',
})
export class ProfitPreviewComponent {
  readonly items: ProfitItem[] = [
    {
      icon: 'decor',
      name: 'Peça decorativa',
      cost: 'R$ 8,40',
      sale: 'R$ 25,00',
      profit: 'R$ 16,60',
      channels: [
        { name: 'Amazon',        fee: '15%', profit: 'R$ 12,85', best: false, shippingProfit: '-R$ 7,15',  shippingNegative: true,  shippingDetail: 'Taxa: 15% + Frete: R$ 20,00' },
        { name: 'Mercado Livre', fee: '18%', profit: 'R$ 12,10', best: false, shippingProfit: '-R$ 7,90',  shippingNegative: true,  shippingDetail: 'Taxa: 18% + Frete: R$ 20,00' },
        { name: 'Venda Direta',  fee: '—',   profit: 'R$ 16,60', best: true,  shippingProfit: '-R$ 3,40',  shippingNegative: true,  shippingDetail: 'Sem taxa + Frete: R$ 20,00'  },
      ],
    },
    {
      icon: 'gear',
      name: 'Engrenagem industrial',
      cost: 'R$ 12,00',
      sale: 'R$ 40,00',
      profit: 'R$ 28,00',
      channels: [
        { name: 'Amazon',        fee: '15%', profit: 'R$ 22,00', best: false, shippingProfit: 'R$ 2,00',   shippingNegative: false, shippingDetail: 'Taxa: 15% + Frete: R$ 20,00' },
        { name: 'Mercado Livre', fee: '18%', profit: 'R$ 20,80', best: false, shippingProfit: 'R$ 0,80',   shippingNegative: false, shippingDetail: 'Taxa: 18% + Frete: R$ 20,00' },
        { name: 'Venda Direta',  fee: '—',   profit: 'R$ 28,00', best: true,  shippingProfit: 'R$ 8,00',   shippingNegative: false, shippingDetail: 'Sem taxa + Frete: R$ 20,00'  },
      ],
    },
    {
      icon: 'miniature',
      name: 'Miniatura colecionável',
      cost: 'R$ 5,50',
      sale: 'R$ 18,00',
      profit: 'R$ 12,50',
      channels: [
        { name: 'Amazon',        fee: '15%', profit: 'R$ 9,80',  best: false, shippingProfit: '-R$ 10,20', shippingNegative: true,  shippingDetail: 'Taxa: 15% + Frete: R$ 20,00' },
        { name: 'Mercado Livre', fee: '18%', profit: 'R$ 9,26',  best: false, shippingProfit: '-R$ 10,74', shippingNegative: true,  shippingDetail: 'Taxa: 18% + Frete: R$ 20,00' },
        { name: 'Venda Direta',  fee: '—',   profit: 'R$ 12,50', best: true,  shippingProfit: '-R$ 7,50',  shippingNegative: true,  shippingDetail: 'Sem taxa + Frete: R$ 20,00'  },
      ],
    },
  ];
}
