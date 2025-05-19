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
        <TouchableOpacity style={styles.filterButton}>
          <Image source={require('../assets/icons/filter.png')} style={styles.filterIcon} />
        </TouchableOpacity>
      </View>
      
      {/* Map */}
      <ViewShot ref={viewShotRef} style={styles.mapContainer}>
        <View style={styles.mapCardShadow}>
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
                <View style={styles.userMarkerOuter}>
                  <View style={styles.userMarkerGlow} />
                  <Image
                    source={require('../assets/icons/navigation.png')}
                    style={styles.userNavIcon}
                  />
                </View>
                <Text style={styles.userMarkerLabel}>You</Text>
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
                  <View style={styles.chargerMarkerShadow}>
                    <View style={styles.chargerMarker}>
                      <Text style={styles.chargerMarkerText}>{idx + 2}</Text>
                      {distance ? (
                        <Text style={styles.chargerMarkerDistance}>{distance}</Text>
                      ) : null}
                    </View>
                  </View>
                </Marker>
              );
            })}
          </MapView>
        </View>
      </ViewShot>
      
      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={captureMap} activeOpacity={0.8}>
        <View style={styles.fabGradient}>
          <Text style={styles.fabIcon}>📸</Text>
        </View>
      </TouchableOpacity>
      
      {/* Bottom Card */}
      {selectedCharger && (
        <View style={styles.bottomCard}>
          <View style={styles.bottomCardBlur} />
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
                <View style={styles.connectorIconBg}>
                  <Image source={require('../assets/icons/connector.png')} style={styles.connectorIcon} />
                </View>
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
    marginTop: 90,
    marginHorizontal: 10,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#181c22',
    elevation: 6,
  },
  mapCardShadow: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#00ffb4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  map: {
    flex: 1,
    borderRadius: 24,
  },
  searchBar: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    zIndex: 10,
    elevation: 5,
    backgroundColor: '#23272e',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
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
  filterButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 6,
    marginLeft: 8,
    elevation: 2,
  },
  filterIcon: {
    width: 26,
    height: 26,
    tintColor: '#00ffb4',
  },
  userMarkerOuter: {
    width: 38, 
    height: 38, 
    borderRadius: 28,
    backgroundColor: '#ff2a7f33',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1, 
    borderColor: '#ff2a7f',
    position: 'relative',
    overflow: 'visible', 
    padding: 8, 
  },
  userMarkerGlow: {
    position: 'absolute',
    width: 70, 
    height: 70, 
    borderRadius: 35,
    backgroundColor: '#ff2a7f44',
    opacity: 0.5,
    zIndex: -1,
    top: -7,
    left: -7,
  },
  userNavIcon: {
    width: 40,
    height: 40, 
    tintColor: '#ff2a7f',
    resizeMode: 'contain', 
  },
  userMarkerLabel: {
    color: '#ff2a7f',
    fontWeight: 'bold',
    marginTop: 2,
    fontSize: 13,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    alignSelf: 'center',
  },
  chargerMarkerShadow: {
    shadowColor: '#2ee6d6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    borderRadius: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chargerMarker: {
    backgroundColor: '#2ee6d6',
    borderRadius: 20,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  chargerMarkerText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  chargerMarkerDistance: {
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  fab: {
    position: 'absolute',
    bottom: 40,
    right: 24,
    borderRadius: 30,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#00ffb4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'linear-gradient(135deg, #00ffb4 0%, #2ee6d6 100%)',
  },
  fabIcon: {
    color: '#23272e',
    fontSize: 32,
    fontWeight: 'bold',
    textShadowColor: '#fff',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(34,34,34,0.95)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    elevation: 12,
    zIndex: 1000,
    shadowColor: '#00ffb4',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  bottomCardBlur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34,34,34,0.7)',
    zIndex: -1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  chargerTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 2,
  },
  chargerAddress: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  chargerDistance: {
    color: '#00ffb4',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 15,
  },
  navIcon: {
    width: 22,
    height: 22,
    tintColor: '#00ffb4',
    marginLeft: 6,
  },
  supportedConnectors: {
    color: '#00ffb4',
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 10,
    textTransform: 'uppercase',
    fontSize: 13,
    letterSpacing: 1,
  },
  connectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    backgroundColor: '#23272e',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
    shadowColor: '#00ffb4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  connectorIconBg: {
    backgroundColor: '#181c22',
    borderRadius: 8,
    padding: 4,
    marginRight: 10,
  },
  connectorIcon: {
    width: 28,
    height: 28,
    tintColor: '#00ffb4',
  },
  connectorLabel: {
    color: '#ffffff',
    fontWeight: 'bold',
    flex: 1,
    fontSize: 15,
  },
  connectorPower: {
    color: '#2ee6d6',
    marginRight: 10,
    fontSize: 13,
    fontWeight: '500',
  },
  connectorCount: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 6,
  },
});

export default HomeScreen;
