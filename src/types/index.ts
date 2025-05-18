// src/types/index.ts
export interface ConnectorType {
  type: string;
  count: number;
}

export interface Charger {
  name: string;
  id: string;
  address: string;
  distance: string;
  distance_metrics: string;
  latitude: string;
  longitude: string;
  connector_types: string[];
}

export interface ParsedCharger extends Omit<Charger, 'connector_types'> {
  connector_types: ConnectorType[];
  latitudeNum: number;
  longitudeNum: number;
}
