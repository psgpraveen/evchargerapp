import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Alert } from 'react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import ViewShot from 'react-native-view-shot';
import Geolocation from '@react-native-community/geolocation';
import { getChargers, Charger } from '../services/dataService';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import RNFetchBlob from 'rn-fetch-blob';
import {GOOGLE_WEB_CLIENT_ID} from '@env'

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

// Dark mode map style
const darkMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#212121" }]
  },
  {
    "elementType": "labels.icon",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#757575" }]
  }, 
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#212121" }]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "featureType": "administrative.country",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#9e9e9e" }]
  },
  {
    "featureType": "administrative.land_parcel",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#bdbdbd" }]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{ "color": "#181818" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#616161" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#1b1b1b" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#2c2c2c" }]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#8a8a8a" }]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [{ "color": "#373737" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#3c3c3c" }]
  },
  {
    "featureType": "road.highway.controlled_access",
    "elementType": "geometry",
    "stylers": [{ "color": "#4e4e4e" }]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#616161" }]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#000000" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#3d3d3d" }]
  }
];

const HomeScreen: React.FC = () => {
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const viewShotRef = useRef<ViewShot>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    // Setup GoogleSignIn
    GoogleSignin.configure({
      // Get from Google Cloud Console
      webClientId: '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.apps.googleusercontent.com',
      offlineAccess: true,
    });

    // Load chargers
    setChargers(getChargers());

    // Live location tracking
    const watchId = Geolocation.watchPosition(
      pos => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      err => console.log(err),
      { enableHighAccuracy: true, distanceFilter: 5, interval: 3000, fastestInterval: 2000 }
    );

    // Cleanup on unmount
    return () => {
      if (watchId !== null && watchId !== undefined) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const captureMap = async () => {
    try {
      if (!viewShotRef.current) throw new Error('ViewShot reference is not available');
      const uri = await viewShotRef.current.capture?.();
      if (!uri) throw new Error('Failed to capture screenshot');
      Alert.alert('Screenshot Captured', 'Map screenshot captured successfully!');
      uploadToGoogleDrive(uri);
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      Alert.alert('Error', 'Failed to capture screenshot');
    }
  };

  const uploadToGoogleDrive = async (fileUri: string) => {
    try {
      const user = await GoogleSignin.getCurrentUser();
      if (!user) {
        await GoogleSignin.hasPlayServices();
        await GoogleSignin.signIn();
      }
      const tokens = await GoogleSignin.getTokens();
      const accessToken = tokens.accessToken;
      const timestamp = new Date().getTime();
      const fileName = `ev_map_${timestamp}.webp`;
      const fileData = await RNFetchBlob.fs.readFile(fileUri, 'base64');
      const metadata = { name: fileName, mimeType: 'image/webp' };

      const uploadResponse = await RNFetchBlob.fetch(
        'POST',
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'multipart/related',
        },
        [
          {
            name: 'metadata',
            data: JSON.stringify(metadata),
            type: 'application/json',
          },
          {
            name: 'file',
            filename: fileName,
            data: fileData,
          },
        ]
      );

      const responseJson = uploadResponse.json();
      if (responseJson.id) {
        Alert.alert('Upload Success', 'Map screenshot uploaded to Google Drive successfully!');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      Alert.alert('Upload Failed', 'Could not upload screenshot to Google Drive');
    }
  };

  const initialRegion: Region = {
    latitude: userLocation?.latitude || 28.6315,
    longitude: userLocation?.longitude || 77.2167,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012,
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <View style={styles.dot} />
        <Text style={styles.searchText}>Search for the compatible chargers</Text>
        <Image source={require('../assets/icons/filter.png')} style={styles.filterIcon} />
      </View>
      
      {/* Map */}
      <ViewShot ref={viewShotRef} style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={initialRegion}
          customMapStyle={darkMapStyle}
          showsUserLocation={true}
          showsCompass={true}
          showsScale={true}
          showsBuildings={false}
          showsIndoors={false}
          region={userLocation ? {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          } : initialRegion}
        >
          {/* User Marker (optional, since showsUserLocation shows blue dot) */}
          {userLocation && (
            <Marker coordinate={userLocation}>
              <View style={{ alignItems: 'center' }}>
                <View style={styles.userMarkerOuter}>
                  <Image
                    source={require('../assets/icons/navigation.png')}
                    style={styles.userNavIcon}
                  />
                </View>
                <Text style={{ color: '#ff2a7f', fontWeight: 'bold', marginTop: 2, fontSize: 12 }}>You</Text>
              </View>
            </Marker>
          )}
          {/* Charger Markers */}
          {chargers.map((charger, idx) => {
            const lat = parseFloat(charger.latitude);
            const lng = parseFloat(charger.longitude);
            if (isNaN(lat) || isNaN(lng)) return null;
            const distance =
              userLocation
                ? `${getDistanceFromLatLonInKm(
                    userLocation.latitude,
                    userLocation.longitude,
                    lat,
                    lng
                  ).toFixed(2)} Km`
                : '';
            return (
              <Marker
                key={charger.id}
                coordinate={{ latitude: lat, longitude: lng }}
                onPress={() => setSelectedCharger(charger)}
              >
                <View style={styles.chargerMarker}>
                  <Text style={styles.chargerMarkerText}>{idx + 2}</Text>
                  {distance ? (
                    <Text style={{ color: '#fff', fontSize: 10 }}>{distance}</Text>
                  ) : null}
                </View>
              </Marker>
            );
          })}
        </MapView>
      </ViewShot>
      
      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={captureMap}>
        <Text style={styles.fabIcon}>📸</Text>
      </TouchableOpacity>
      
      {/* Bottom Card */}
      {selectedCharger && (
        <View style={styles.bottomCard}>
          <Text style={styles.chargerTitle}>{selectedCharger.name.toUpperCase()}</Text>
          <View style={styles.addressContainer}>
            <Text style={styles.chargerAddress}>{selectedCharger.address}, </Text>
            <Text style={styles.chargerDistance}>
              {userLocation
                ? `${getDistanceFromLatLonInKm(
                    userLocation.latitude,
                    userLocation.longitude,
                    parseFloat(selectedCharger.latitude),
                    parseFloat(selectedCharger.longitude)
                  ).toFixed(2)} Km`
                : '... Km'}
            </Text>
            {/* Update the path below if your folder is 'icone' instead of 'icons' */}
            <Image source={require('../assets/icons/navigation.png')} style={styles.navIcon} />
          </View>
          <Text style={styles.supportedConnectors}>SUPPORTED CONNECTORS</Text>
          {selectedCharger.connector_types.map((type, idx) => {
            const [label, count] = type.split('-');
            let display = '', power = '';
            if (label === 'lvl1dc') { display = 'Level 1 DC'; power = '15kW Fast Charging'; }
            else if (label === 'lvl2dc') { display = 'Level 2 DC'; power = '50kW Fast Charging'; }
            else if (label === 'normalac') { display = 'Normal AC'; power = '3kW Charging'; }
            return (
              <View key={idx} style={styles.connectorRow}>
                <Image source={require('../assets/icons/connector.png')} style={styles.connectorIcon} />
                <Text style={styles.connectorLabel}>{display}</Text>
                <Text style={styles.connectorPower}>{power}</Text>
                <Text style={styles.connectorCount}>x{count}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222222',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  searchBar: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    zIndex: 10,
    elevation: 5,
    backgroundColor: '#222222',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00ffb4',
    marginRight: 10,
  },
  searchText: {
    color: '#ffffff',
    flex: 1,
    fontSize: 16,
  },
  filterIcon: {
    width: 24,
    height: 24,
    tintColor: '#00ffb4',
  },
  userMarkerOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ff2a7f33', // pink with transparency
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ff2a7f',
  },
  userMarkerInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff2a7f',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  userNavIcon: {
    width: 32,
    height: 32,
    tintColor: '#ff2a7f',
  },
  chargerMarker: {
    backgroundColor: '#2ee6d6',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  chargerMarkerText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 40,
    right: 24,
    backgroundColor: '#222222',
    borderRadius: 30,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabIcon: {
    color: '#ffffff',
    fontSize: 28,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#222222',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    elevation: 10,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  chargerTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 18,
    textTransform: 'uppercase',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  chargerAddress: {
    color: '#ffffff',
  },
  chargerDistance: {
    color: '#ff2a7f',
    fontWeight: 'bold',
  },
  navIcon: {
    width: 20,
    height: 20,
    tintColor: '#ff2a7f',
    marginLeft: 4,
  },
  supportedConnectors: {
    color: '#00ffb4',
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  connectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  connectorIcon: {
    width: 28,
    height: 28,
    marginRight: 8,
  },
  connectorLabel: {
    color: '#ffffff',
    fontWeight: 'bold',
    flex: 1,
  },
  connectorPower: {
    color: '#00ffb4',
    marginRight: 8,
  },
  connectorCount: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});

export default HomeScreen;
