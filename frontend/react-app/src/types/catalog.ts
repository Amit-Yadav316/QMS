// Reference catalogs (grades, components).

export type GradeType = 'NORMAL' | 'FREE_FLOW';

export interface GradeResponse {
  grade_id: number;
  grade_name: string;
  grade_type: GradeType;
  min_strength_mpa: number;
  grade_variant: string | null;
}

export type ComponentTypeValue =
  | 'COLUMN' | 'SLAB' | 'BEAM' | 'RAFT'
  | 'SHEAR_WALL' | 'STAIRCASE' | 'LIFT_CORE' | 'FOUNDATION';

export interface ComponentResponse {
  component_id: number;
  component_type: ComponentTypeValue;
  description: string | null;
}
