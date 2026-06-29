// Mix designs.

export type MixApprovalStatus = 'APPROVED' | 'REJECTED' | 'IN_PROGRESS';
export type CementType = 'OPC_43' | 'OPC_53';

export interface MixDesignCreate {
  supplier_id: number;
  grade_id: number;
  contractor_name?: string | null;
  cement_kg?: number | null;
  flyash_kg?: number | null;
  water_kg?: number | null;
  fine_agg_kg?: number | null;
  coarse_20mm_kg?: number | null;
  coarse_10mm_kg?: number | null;
  admixture_kg?: number | null;
  admixture_brand?: string | null;
  wc_ratio?: number | null;
  cement_type?: CementType | null;
  trial_mix_date?: string | null;
  strength_7day_mpa?: number | null;
  strength_28day_mpa?: number | null;
  approval_status?: MixApprovalStatus | null;
}

export interface MixDesignResponse {
  mix_design_id: number;
  project_id: number | null;
  supplier_id: number;
  supplier_name: string | null;
  grade_id: number;
  grade_name: string | null;
  contractor_name: string | null;
  wc_ratio: number | null;
  cement_type: CementType | null;
  approval_status: MixApprovalStatus | null;
  strength_28day_mpa: number | null;
  created_at: string;
}
