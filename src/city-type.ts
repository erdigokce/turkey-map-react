export type Region =
  | "marmara"
  | "ege"
  | "akdeniz"
  | "ic-anadolu"
  | "karadeniz"
  | "dogu-anadolu"
  | "guneydogu-anadolu";

export type Centroid = {
  x: number;
  y: number;
};

export type CityType = {
  id: string;
  plateNumber: number;
  name: string;
  path: string;
  disabled?: boolean;
  region?: Region;
  centroid?: Centroid;
  neighbors?: string[];
  areaKm2?: number;
  population?: number;
  isoCode?: string;
  nutsCode?: string;
  altNames?: string[];
  meta?: Record<string, unknown>;
};
