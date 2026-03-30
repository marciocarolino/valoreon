export type ProductionMaterial = 'PLA' | 'ABS' | 'PETG';
export type ProductionColor    = 'Preto e Branco' | 'Colorido';
export type ProductionSize     = 'Pequeno' | 'Médio' | 'Grande';

export type ProductionStatus = 'ACTIVE' | 'ARCHIVED';

export interface Production {
  id:             number;
  printerId:      number;
  /** Some APIs nest id here; use with `printer.id` when present */
  printer?:       { id: number; name?: string };
  printerName:    string;
  name:           string;
  printTimeHours: number;
  weight:         number;
  quantity:       number;
  material:       ProductionMaterial;
  color:          ProductionColor;
  size:           ProductionSize;
  filamentPrice:  number;
  /** snake_case from some APIs */
  filament_price?: number;
  salePrice:      number;
  /** salePrice × quantity — from API */
  totalRevenue?:  number;
  totalCost:      number;
  profit:         number;
  margin?:        number;
  energyCost?:    number;
  materialCost?:  number;
  userEmail:      string;
  createdAt:      string;
  status:         ProductionStatus;
}

/** Cursor for GET /productions?cursorCreatedAt=&cursorId= */
export interface ProductionCursor {
  createdAt: string;
  id: number;
}

export interface ProductionListResponse {
  items: Production[];
  hasNext: boolean;
  nextCursor: ProductionCursor | null;
}

export interface CreateProductionRequest {
  printerId:      number;
  name:           string;
  salePrice:      number;
  quantity:       number;
  printTimeHours: number;
  material:       ProductionMaterial;
  weight:         number;
  filamentPrice:  number;
  color:          ProductionColor;
  size:           ProductionSize;
  // calculated fields sent to backend
  energyCost:     number;
  materialCost:   number;
  totalCost:      number;
  profit:         number;
  margin:         number;
  userEmail:      string;
}
