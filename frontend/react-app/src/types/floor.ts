// Floors (per tower).

export interface FloorCreate {
  floor_label: string;
  floor_number?: number | null;
}

export interface FloorGenerate {
  count: number;
  start_number?: number;
  label_prefix?: string;
}

export interface FloorResponse {
  floor_id: number;
  tower_id: number;
  floor_label: string;
  floor_number: number | null;
}
