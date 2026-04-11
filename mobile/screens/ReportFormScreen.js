import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
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

export default function ReportFormScreen() {
  const [issue,       setIssue]       = useState(null);
  const [lat,         setLat]         = useState(null);
  const [lng,         setLng]         = useState(null);
  const [address,     setAddress]     = useState('');
  const [description, setDescription] = useState('');
  const [photo,       setPhoto]       = useState(null);
  const [locLabel,    setLocLabel]    = useState(null);
  const [submitting,  setSubmitting]  = useState(false);

  async function getLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Allow location access to use this feature.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setLat(loc.coords.latitude);
    setLng(loc.coords.longitude);
    setLocLabel(`${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`);
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
    if (!lat) {
      Alert.alert('Missing info', 'Please set your location.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/reports`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat, lng,
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
    setLat(null);
    setLng(null);
    setAddress('');
    setDescription('');
    setPhoto(null);
    setLocLabel(null);
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

        <View style={s.section}>
          <Text style={s.label}>
            Location <Text style={s.req}>*</Text>
          </Text>
          <TouchableOpacity style={s.locBtn} onPress={getLocation} activeOpacity={0.7}>
            <Text style={s.locTag}>LOC</Text>
            <Text style={[s.locText, locLabel && s.locTextSet]}>
              {locLabel || 'Tap to use your current location'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={s.section}>
          <Text style={s.label}>Street / intersection</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Trafalgar Rd & Dundas St"
            placeholderTextColor={COLORS.text3}
            value={address}
            onChangeText={setAddress}
          />
        </View>

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
  req:               { color: COLORS.red },
  issueGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  issueBtn:          { width: '30%', backgroundColor: COLORS.bg3, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  issueBtnActive:    { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: COLORS.green },
  issueLabel:        { fontSize: 12, color: COLORS.text2, textAlign: 'center' },
  issueLabelActive:  { color: COLORS.green },
  locBtn:            { backgroundColor: COLORS.bg3, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: COLORS.border },
  locTag:            { fontSize: 10, fontWeight: '600', color: COLORS.green, backgroundColor: 'rgba(34,197,94,0.12)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  locText:           { fontSize: 13, color: COLORS.text3, flex: 1 },
  locTextSet:        { color: COLORS.green },
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