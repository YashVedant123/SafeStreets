import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from './MapScreen';
import { API } from '../config';

const ISSUES = [
  { key: 'no_crosswalk',  label: 'No Crosswalk'  },
  { key: 'speeding',      label: 'Speeding'       },
  { key: 'poor_lighting', label: 'Poor Lighting'  },
  { key: 'blind_corner',  label: 'Blind Corner'   },
  { key: 'no_sidewalk',   label: 'No Sidewalk'    },
  { key: 'other',         label: 'Other'          },
];

const OAKVILLE = {
  latitude:       43.4675,
  longitude:      -79.6877,
  latitudeDelta:  0.06,
  longitudeDelta: 0.06,
};

const MAP_HEIGHT = Dimensions.get('window').width * 0.55;

const darkMapStyle = [
  { elementType: 'geometry',           stylers: [{ color: '#0e1117' }] },
  { elementType: 'labels.text.fill',   stylers: [{ color: '#8b95a8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0e1117' }] },
  { featureType: 'road',               elementType: 'geometry', stylers: [{ color: '#1d2535' }] },
  { featureType: 'road.arterial',      elementType: 'geometry', stylers: [{ color: '#1d2535' }] },
  { featureType: 'road.highway',       elementType: 'geometry', stylers: [{ color: '#2a3547' }] },
  { featureType: 'water',              elementType: 'geometry', stylers: [{ color: '#0a0f16' }] },
  { featureType: 'poi',                elementType: 'geometry', stylers: [{ color: '#161b24' }] },
  { featureType: 'administrative',     elementType: 'geometry.stroke', stylers: [{ color: '#1d2535' }] },
];

export default function ReportFormScreen() {
  const [issue,       setIssue]       = useState(null);
  const [pin,         setPin]         = useState(null);   // { latitude, longitude }
  const [address,     setAddress]     = useState('');
  const [geocoding,   setGeocoding]   = useState(false);
  const [description, setDescription] = useState('');
  const [photo,       setPhoto]       = useState(null);
  const [submitting,  setSubmitting]  = useState(false);

  async function handleMapPress(e) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPin({ latitude, longitude });
    reverseGeocode(latitude, longitude);
  }

  async function handleGPS() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Allow location access to use this feature.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;
    setPin({ latitude, longitude });
    reverseGeocode(latitude, longitude);
  }

  async function reverseGeocode(latitude, longitude) {
    setGeocoding(true);
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (results && results.length > 0) {
        const r = results[0];
        const parts = [r.name, r.street, r.city].filter(Boolean);
        setAddress(parts.join(', '));
      }
    } catch(e) {
      console.log('Reverse geocode failed:', e);
    } finally {
      setGeocoding(false);
    }
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Allow photo access to attach images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.6,
    });
    if (!result.canceled) {
      setPhoto('data:image/jpeg;base64,' + result.assets[0].base64);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Allow camera access to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.6,
    });
    if (!result.canceled) {
      setPhoto('data:image/jpeg;base64,' + result.assets[0].base64);
    }
  }

  function showPhotoOptions() {
    Alert.alert('Add Photo', 'Choose a source', [
      { text: 'Camera',        onPress: takePhoto },
      { text: 'Photo Library', onPress: pickPhoto },
      { text: 'Cancel',        style: 'cancel'    },
    ]);
  }

  async function submit() {
    if (!issue) {
      Alert.alert('Missing info', 'Please select an issue type.');
      return;
    }
    if (!pin) {
      Alert.alert('Missing info', 'Tap the map to drop a pin on the danger spot.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/reports`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat:         pin.latitude,
          lng:         pin.longitude,
          issue_type:  issue,
          description,
          address,
          photo: photo || '',
        }),
      });
      if (!res.ok) throw new Error();
      Alert.alert(
        'Submitted',
        'Your report has been filed. Thank you for making Oakville safer.',
        [{ text: 'OK', onPress: resetForm }]
      );
    } catch(e) {
      Alert.alert('Error', 'Could not submit. Is the server running?');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setIssue(null);
    setPin(null);
    setAddress('');
    setDescription('');
    setPhoto(null);
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      <View style={s.header}>
        <Text style={s.title}>Report a Danger Spot</Text>
        <Text style={s.sub}>Anonymous reports welcome</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ISSUE TYPE */}
        <View style={s.section}>
          <Text style={s.label}>
            Issue type <Text style={s.req}>*</Text>
          </Text>
          <View style={s.issueGrid}>
            {ISSUES.map(item => (
              <TouchableOpacity
                key={item.key}
                style={[s.issueBtn, issue === item.key && s.issueBtnActive]}
                onPress={() => setIssue(item.key)}
                activeOpacity={0.7}
              >
                <Text style={[s.issueLabel, issue === item.key && s.issueLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* MAP PIN DROP */}
        <View style={s.section}>
          <View style={s.labelRow}>
            <Text style={s.label}>
              Location <Text style={s.req}>*</Text>
            </Text>
            <TouchableOpacity style={s.gpsBtn} onPress={handleGPS}>
              <Text style={s.gpsBtnText}>Use GPS</Text>
            </TouchableOpacity>
          </View>

          <View style={s.mapWrap}>
            <MapView
              style={s.miniMap}
              initialRegion={OAKVILLE}
              customMapStyle={darkMapStyle}
              onPress={handleMapPress}
              showsUserLocation
            >
              {pin && (
                <Marker
                  coordinate={pin}
                  draggable
                  onDragEnd={e => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    setPin({ latitude, longitude });
                    reverseGeocode(latitude, longitude);
                  }}
                  pinColor={COLORS.green}
                />
              )}
            </MapView>
            {!pin && (
              <View style={s.mapHint} pointerEvents="none">
                <Text style={s.mapHintText}>Tap the map to drop a pin</Text>
              </View>
            )}
          </View>
        </View>

        {/* ADDRESS — auto-filled, editable */}
        <View style={s.section}>
          <Text style={s.label}>
            Address {geocoding ? <Text style={s.geocodingLabel}> — locating...</Text> : null}
          </Text>
          <TextInput
            style={s.input}
            placeholder="Tap the map to auto-fill"
            placeholderTextColor={COLORS.text3}
            value={address}
            onChangeText={setAddress}
          />
        </View>

        {/* DESCRIPTION */}
        <View style={s.section}>
          <Text style={s.label}>Description</Text>
          <TextInput
            style={[s.input, s.textarea]}
            placeholder="What makes this spot dangerous? Any near-misses?"
            placeholderTextColor={COLORS.text3}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* PHOTO */}
        <View style={s.section}>
          <Text style={s.label}>Photo (optional)</Text>
          <TouchableOpacity
            style={[s.photoBtn, photo && s.photoBtnSet]}
            onPress={showPhotoOptions}
            activeOpacity={0.7}
          >
            <Text style={s.photoTag}>{photo ? 'DONE' : 'CAM'}</Text>
            <Text style={s.photoText}>
              {photo ? 'Photo attached — tap to change' : 'Tap to add a photo'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* SUBMIT */}
        <TouchableOpacity
          style={[s.submitBtn, submitting && s.submitBtnDisabled]}
          onPress={submit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          <Text style={s.submitText}>
            {submitting ? 'Submitting...' : 'Submit Report'}
          </Text>
        </TouchableOpacity>

        <Text style={s.anonNote}>
          Reports are anonymous by default. Verify your account in Settings to add a trust badge.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:         { flex: 1, backgroundColor: COLORS.bg },
  header:            { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:             { fontSize: 18, fontWeight: '600', color: COLORS.text, letterSpacing: -0.3 },
  sub:               { fontSize: 12, color: COLORS.text2, marginTop: 2 },
  scroll:            { flex: 1 },
  scrollContent:     { padding: 20, gap: 24, paddingBottom: 40 },
  section:           { gap: 10 },
  label:             { fontSize: 13, fontWeight: '500', color: COLORS.text2 },
  geocodingLabel:    { color: COLORS.text3, fontWeight: '400' },
  req:               { color: COLORS.red },
  labelRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gpsBtn:            { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  gpsBtnText:        { fontSize: 12, color: COLORS.green, fontWeight: '500' },
  mapWrap:           { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, height: MAP_HEIGHT },
  miniMap:           { width: '100%', height: '100%' },
  mapHint:           { position: 'absolute', bottom: 10, left: 0, right: 0, alignItems: 'center' },
  mapHintText:       { fontSize: 12, color: COLORS.text3, backgroundColor: COLORS.bg2, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  issueGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  issueBtn:          { width: '30%', backgroundColor: COLORS.bg3, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  issueBtnActive:    { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: COLORS.green },
  issueLabel:        { fontSize: 12, color: COLORS.text2, textAlign: 'center' },
  issueLabelActive:  { color: COLORS.green },
  input:             { backgroundColor: COLORS.bg3, borderRadius: 12, padding: 14, fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  textarea:          { minHeight: 100, textAlignVertical: 'top' },
  photoBtn:          { backgroundColor: COLORS.bg3, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: COLORS.border },
  photoBtnSet:       { borderColor: COLORS.green },
  photoTag:          { fontSize: 10, fontWeight: '600', color: COLORS.text2, backgroundColor: COLORS.bg, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border2 },
  photoText:         { fontSize: 13, color: COLORS.text3 },
  submitBtn:         { backgroundColor: COLORS.green, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  submitBtnDisabled: { opacity: 0.5 },
  submitText:        { fontSize: 16, fontWeight: '600', color: '#000' },
  anonNote:          { fontSize: 12, color: COLORS.text3, textAlign: 'center', lineHeight: 18 },
});