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
const chargerData = {
  chargers: [
    {
      name: "expressway charging - mariam enterprise",
      id: "a001",
      address: "connaught place, delhi",
      distance: "2102",
      distance_metrics: "metres",
      latitude: "28.6315",
      longitude: "77.2167",
      connector_types: ["lvl1dc-2", "lvl2dc-1", "normalac-1"]
    },
    {
      name: "rapid charging station",
      id: "a002",
      address: "rajiv chowk, delhi",
      distance: "3200",
      distance_metrics: "metres",
      latitude: "28.6330",
      longitude: "77.2190",
      connector_types: ["lvl2dc-2", "normalac-2"]
    },
    {
      name: "green power station",
      id: "a003",
      address: "karol bagh, delhi",
      distance: "4500",
      distance_metrics: "metres",
      latitude: "28.6280",
      longitude: "77.2090",
      connector_types: ["lvl1dc-1", "lvl2dc-1", "normalac-3"]
    },
    {
      name: "eMobility hub",
      id: "a004",
      address: "janpath, delhi",
      distance: "3000",
      distance_metrics: "metres",
      latitude: "28.6270",
      longitude: "77.2240",
      connector_types: ["lvl1dc-3", "lvl2dc-2"]
    }
  ]
};

export const getChargers = (): Charger[] => chargerData.chargers;
