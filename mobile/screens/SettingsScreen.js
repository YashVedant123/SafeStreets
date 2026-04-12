import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { auth } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from 'firebase/auth';
import { COLORS } from './MapScreen';
import { useTheme } from '../ThemeContext';

export default function SettingsScreen({ navigation }) {
  const { dark, setDark } = useTheme();

  const bg      = dark ? COLORS.bg      : '#f5f5f7';
  const bg2     = dark ? COLORS.bg2     : '#ffffff';
  const bg3     = dark ? COLORS.bg3     : '#f0f0f2';
  const border  = dark ? COLORS.border  : 'rgba(0,0,0,0.08)';
  const border2 = dark ? COLORS.border2 : 'rgba(0,0,0,0.15)';
  const text    = dark ? COLORS.text    : '#111827';
  const text2   = dark ? COLORS.text2   : '#4b5563';
  const text3   = dark ? COLORS.text3   : '#9ca3af';

  const [user,     setUser]     = useState(auth.currentUser);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authMode, setAuthMode] = useState('signin');
  const [loading,  setLoading]  = useState(false);

  async function handleSignUp() {
    if (!email || !password) { Alert.alert('Missing info', 'Enter an email and password.'); return; }
    if (password.length < 6) { Alert.alert('Weak password', 'Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(result.user);
      setUser(result.user);
      Alert.alert('Account created', 'Check your email to verify your account and get your trust badge.');
    } catch(e) { Alert.alert('Error', e.message); }
    finally    { setLoading(false); }
  }

  async function handleSignIn() {
    if (!email || !password) { Alert.alert('Missing info', 'Enter your email and password.'); return; }
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setUser(result.user);
    } catch(e) { Alert.alert('Sign in failed', e.message); }
    finally    { setLoading(false); }
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        await signOut(auth);
        setUser(null);
        setEmail('');
        setPassword('');
      }},
    ]);
  }

  async function resendVerification() {
    try {
      await sendEmailVerification(auth.currentUser);
      Alert.alert('Sent', 'Verification email resent. Check your inbox.');
    } catch(e) { Alert.alert('Error', e.message); }
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: bg }]} edges={['top']}>

      <View style={[s.header, { borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={[s.title, { color: text }]}>Settings</Text>
        <View style={{ width: 52 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ACCOUNT */}
        <Text style={[s.sectionTitle, { color: text3 }]}>Account</Text>

        {user ? (
          <View style={[s.card, { backgroundColor: bg2, borderColor: border }]}>
            <View style={s.accountRow}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{(user.email || 'U')[0].toUpperCase()}</Text>
              </View>
              <View style={s.accountInfo}>
                <Text style={[s.accountEmail, { color: text }]}>{user.email}</Text>
                {user.emailVerified ? (
                  <View style={s.statusRow}>
                    <View style={[s.dot, { backgroundColor: COLORS.green }]} />
                    <Text style={[s.statusText, { color: COLORS.green }]}>Verified — trust badge active</Text>
                  </View>
                ) : (
                  <View style={s.statusRow}>
                    <View style={[s.dot, { backgroundColor: COLORS.amber }]} />
                    <Text style={[s.statusText, { color: COLORS.amber }]}>Email not verified</Text>
                  </View>
                )}
              </View>
            </View>
            {!user.emailVerified && (
              <TouchableOpacity style={s.resendBtn} onPress={resendVerification}>
                <Text style={s.resendText}>Resend verification email</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
              <Text style={s.signOutText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[s.card, { backgroundColor: bg2, borderColor: border }]}>
            <View style={[s.tabRow, { backgroundColor: bg3 }]}>
              <TouchableOpacity
                style={[s.tab, authMode === 'signin' && { backgroundColor: bg2 }]}
                onPress={() => setAuthMode('signin')}
              >
                <Text style={[s.tabText, { color: authMode === 'signin' ? text : text3 }]}>Sign in</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tab, authMode === 'signup' && { backgroundColor: bg2 }]}
                onPress={() => setAuthMode('signup')}
              >
                <Text style={[s.tabText, { color: authMode === 'signup' ? text : text3 }]}>Create account</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[s.input, { backgroundColor: bg3, borderColor: border2, color: text }]}
              placeholder="Email address"
              placeholderTextColor={text3}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={[s.input, { backgroundColor: bg3, borderColor: border2, color: text }]}
              placeholder="Password"
              placeholderTextColor={text3}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[s.authBtn, loading && s.authBtnDisabled]}
              onPress={authMode === 'signin' ? handleSignIn : handleSignUp}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={s.authBtnText}>
                {loading ? 'Loading...' : authMode === 'signin' ? 'Sign in' : 'Create account'}
              </Text>
            </TouchableOpacity>

            <Text style={[s.anonNote, { color: text3 }]}>
              You can submit reports without an account. Signing in adds a verified trust badge to your reports.
            </Text>
          </View>
        )}

        {/* PROFILE */}
        <Text style={[s.sectionTitle, { color: text3 }]}>Profile</Text>
        <View style={[s.card, { backgroundColor: bg2, borderColor: border }]}>
          <Text style={[s.fieldLabel, { color: text2 }]}>Display name</Text>
          <TextInput
            style={[s.input, { backgroundColor: bg3, borderColor: border2, color: text }]}
            placeholder="How you appear on reports (optional)"
            placeholderTextColor={text3}
            value={username}
            onChangeText={setUsername}
          />
          <TouchableOpacity style={[s.saveBtn, { backgroundColor: bg3, borderColor: border }]}>
            <Text style={[s.saveBtnText, { color: text2 }]}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* APPEARANCE */}
        <Text style={[s.sectionTitle, { color: text3 }]}>Appearance</Text>
        <View style={[s.card, { backgroundColor: bg2, borderColor: border }]}>
          <View style={s.settingRow}>
            <View>
              <Text style={[s.settingLabel, { color: text }]}>Dark mode</Text>
              <Text style={[s.settingDesc, { color: text3 }]}>Easier on the eyes at night</Text>
            </View>
            <Switch
              value={dark}
              onValueChange={setDark}
              trackColor={{ false: bg3, true: COLORS.green }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ABOUT */}
        <Text style={[s.sectionTitle, { color: text3 }]}>About</Text>
        <View style={[s.card, { backgroundColor: bg2, borderColor: border }]}>
          {[
            ['Project',  'SafeStreets Oakville'],
            ['Built by', 'Yash Vedant'],
            ['Version',  '1.0.0'],
            ['GitHub',   'YashVedant123/SafeStreets'],
          ].map(([label, value], i, arr) => (
            <View key={label}>
              <View style={s.aboutRow}>
                <Text style={[s.aboutLabel, { color: text3 }]}>{label}</Text>
                <Text style={[s.aboutValue, { color: label === 'GitHub' ? COLORS.green : text }]}>
                  {value}
                </Text>
              </View>
              {i < arr.length - 1 && <View style={[s.divider, { backgroundColor: border }]} />}
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1 },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn:         { paddingVertical: 4, paddingHorizontal: 8 },
  backText:        { fontSize: 15, color: COLORS.green },
  title:           { fontSize: 16, fontWeight: '600' },
  scroll:          { flex: 1 },
  scrollContent:   { padding: 20, gap: 12, paddingBottom: 40 },
  sectionTitle:    { fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 8, marginBottom: 4 },
  card:            { borderRadius: 14, padding: 16, borderWidth: 1, gap: 12 },
  accountRow:      { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar:          { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(34,197,94,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  avatarText:      { fontSize: 18, fontWeight: '600', color: COLORS.green },
  accountInfo:     { flex: 1, gap: 4 },
  accountEmail:    { fontSize: 14, fontWeight: '500' },
  statusRow:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:             { width: 7, height: 7, borderRadius: 99 },
  statusText:      { fontSize: 12 },
  resendBtn:       { backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  resendText:      { fontSize: 13, color: COLORS.amber, fontWeight: '500' },
  signOutBtn:      { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  signOutText:     { fontSize: 13, color: COLORS.red, fontWeight: '500' },
  tabRow:          { flexDirection: 'row', borderRadius: 10, padding: 3 },
  tab:             { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabText:         { fontSize: 13, fontWeight: '500' },
  input:           { borderRadius: 10, padding: 13, fontSize: 14, borderWidth: 1 },
  authBtn:         { backgroundColor: COLORS.green, borderRadius: 10, padding: 14, alignItems: 'center' },
  authBtnDisabled: { opacity: 0.5 },
  authBtnText:     { fontSize: 15, fontWeight: '600', color: '#000' },
  anonNote:        { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  fieldLabel:      { fontSize: 13, fontWeight: '500' },
  saveBtn:         { borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1 },
  saveBtnText:     { fontSize: 14, fontWeight: '500' },
  settingRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingLabel:    { fontSize: 14, fontWeight: '500' },
  settingDesc:     { fontSize: 12, marginTop: 2 },
  aboutRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  aboutLabel:      { fontSize: 13 },
  aboutValue:      { fontSize: 13 },
  divider:         { height: 1, marginVertical: 4 },
});