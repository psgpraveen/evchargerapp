import second from '../assets/data/chargers.json'
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

// This would normally be loaded from a JSON file
// For this example, we'll define it inline
const chargerData = second;

export const getChargers = (): Charger[] => chargerData.chargers;
