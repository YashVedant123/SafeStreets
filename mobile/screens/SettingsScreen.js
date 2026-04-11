import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { COLORS } from './MapScreen';

export default function SettingsScreen({ navigation }) {
  const [user,        setUser]        = useState(auth.currentUser);
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [username,    setUsername]    = useState('');
  const [darkMode,    setDarkMode]    = useState(true);
  const [authMode,    setAuthMode]    = useState('signin');
  const [loading,     setLoading]     = useState(false);

  async function handleSignUp() {
    if (!email || !password) {
      Alert.alert('Missing info', 'Enter an email and password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(result.user);
      setUser(result.user);
      Alert.alert('Account created', 'Check your email to verify your account and get your trust badge.');
    } catch(e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    if (!email || !password) {
      Alert.alert('Missing info', 'Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setUser(result.user);
    } catch(e) {
      Alert.alert('Sign in failed', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut(auth);
          setUser(null);
          setEmail('');
          setPassword('');
        }
      }
    ]);
  }

  async function resendVerification() {
    try {
      await sendEmailVerification(auth.currentUser);
      Alert.alert('Sent', 'Verification email resent. Check your inbox.');
    } catch(e) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Settings</Text>
        <View style={{ width: 52 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ACCOUNT SECTION */}
        <Text style={s.sectionTitle}>Account</Text>

        {user ? (
          <View style={s.card}>
            <View style={s.accountRow}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>
                  {(user.email || 'U')[0].toUpperCase()}
                </Text>
              </View>
              <View style={s.accountInfo}>
                <Text style={s.accountEmail}>{user.email}</Text>
                {user.emailVerified ? (
                  <View style={s.verifiedRow}>
                    <View style={s.verifiedDot} />
                    <Text style={s.verifiedText}>Verified — trust badge active</Text>
                  </View>
                ) : (
                  <View style={s.verifiedRow}>
                    <View style={s.unverifiedDot} />
                    <Text style={s.unverifiedText}>Email not verified</Text>
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
          <View style={s.card}>
            <View style={s.tabRow}>
              <TouchableOpacity
                style={[s.tab, authMode === 'signin' && s.tabActive]}
                onPress={() => setAuthMode('signin')}
              >
                <Text style={[s.tabText, authMode === 'signin' && s.tabTextActive]}>
                  Sign in
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tab, authMode === 'signup' && s.tabActive]}
                onPress={() => setAuthMode('signup')}
              >
                <Text style={[s.tabText, authMode === 'signup' && s.tabTextActive]}>
                  Create account
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={s.input}
              placeholder="Email address"
              placeholderTextColor={COLORS.text3}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={s.input}
              placeholder="Password"
              placeholderTextColor={COLORS.text3}
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
                {loading
                  ? 'Loading...'
                  : authMode === 'signin' ? 'Sign in' : 'Create account'}
              </Text>
            </TouchableOpacity>

            <Text style={s.anonNote}>
              You can submit reports without an account. Signing in adds a verified trust badge to your reports.
            </Text>
          </View>
        )}

        {/* PROFILE SECTION */}
        <Text style={s.sectionTitle}>Profile</Text>
        <View style={s.card}>
          <Text style={s.fieldLabel}>Display name</Text>
          <TextInput
            style={s.input}
            placeholder="How you appear on reports (optional)"
            placeholderTextColor={COLORS.text3}
            value={username}
            onChangeText={setUsername}
          />
          <TouchableOpacity style={s.saveBtn}>
            <Text style={s.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* APPEARANCE SECTION */}
        <Text style={s.sectionTitle}>Appearance</Text>
        <View style={s.card}>
          <View style={s.settingRow}>
            <View>
              <Text style={s.settingLabel}>Dark mode</Text>
              <Text style={s.settingDesc}>Easier on the eyes at night</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: COLORS.bg3, true: COLORS.green }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ABOUT SECTION */}
        <Text style={s.sectionTitle}>About</Text>
        <View style={s.card}>
          <View style={s.aboutRow}>
            <Text style={s.aboutLabel}>Project</Text>
            <Text style={s.aboutValue}>SafeStreets Oakville</Text>
          </View>
          <View style={s.divider} />
          <View style={s.aboutRow}>
            <Text style={s.aboutLabel}>Built by</Text>
            <Text style={s.aboutValue}>Yash Vedant</Text>
          </View>
          <View style={s.divider} />
          <View style={s.aboutRow}>
            <Text style={s.aboutLabel}>Version</Text>
            <Text style={s.aboutValue}>1.0.0</Text>
          </View>
          <View style={s.divider} />
          <View style={s.aboutRow}>
            <Text style={s.aboutLabel}>GitHub</Text>
            <Text style={[s.aboutValue, s.link]}>YashVedant123/SafeStreets</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.bg },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn:         { paddingVertical: 4, paddingHorizontal: 8 },
  backText:        { fontSize: 15, color: COLORS.green },
  title:           { fontSize: 16, fontWeight: '600', color: COLORS.text },
  scroll:          { flex: 1 },
  scrollContent:   { padding: 20, gap: 12, paddingBottom: 40 },
  sectionTitle:    { fontSize: 12, fontWeight: '600', color: COLORS.text3, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 8, marginBottom: 4 },
  card:            { backgroundColor: COLORS.bg2, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  accountRow:      { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar:          { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(34,197,94,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  avatarText:      { fontSize: 18, fontWeight: '600', color: COLORS.green },
  accountInfo:     { flex: 1, gap: 4 },
  accountEmail:    { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  verifiedRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verifiedDot:     { width: 7, height: 7, borderRadius: 99, backgroundColor: COLORS.green },
  unverifiedDot:   { width: 7, height: 7, borderRadius: 99, backgroundColor: COLORS.amber },
  verifiedText:    { fontSize: 12, color: COLORS.green },
  unverifiedText:  { fontSize: 12, color: COLORS.amber },
  resendBtn:       { backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  resendText:      { fontSize: 13, color: COLORS.amber, fontWeight: '500' },
  signOutBtn:      { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  signOutText:     { fontSize: 13, color: COLORS.red, fontWeight: '500' },
  tabRow:          { flexDirection: 'row', backgroundColor: COLORS.bg3, borderRadius: 10, padding: 3 },
  tab:             { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive:       { backgroundColor: COLORS.bg2 },
  tabText:         { fontSize: 13, color: COLORS.text3 },
  tabTextActive:   { color: COLORS.text, fontWeight: '500' },
  input:           { backgroundColor: COLORS.bg3, borderRadius: 10, padding: 13, fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  authBtn:         { backgroundColor: COLORS.green, borderRadius: 10, padding: 14, alignItems: 'center' },
  authBtnDisabled: { opacity: 0.5 },
  authBtnText:     { fontSize: 15, fontWeight: '600', color: '#000' },
  anonNote:        { fontSize: 12, color: COLORS.text3, textAlign: 'center', lineHeight: 18 },
  fieldLabel:      { fontSize: 13, fontWeight: '500', color: COLORS.text2 },
  saveBtn:         { backgroundColor: COLORS.bg3, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  saveBtnText:     { fontSize: 14, color: COLORS.text2, fontWeight: '500' },
  settingRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingLabel:    { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  settingDesc:     { fontSize: 12, color: COLORS.text3, marginTop: 2 },
  aboutRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aboutLabel:      { fontSize: 13, color: COLORS.text3 },
  aboutValue:      { fontSize: 13, color: COLORS.text },
  link:            { color: COLORS.green },
  divider:         { height: 1, backgroundColor: COLORS.border },
});