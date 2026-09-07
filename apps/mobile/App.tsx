import { useState } from 'react'
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { initialStudioSnapshot, type StreamStatus } from '@youtube-live-studio/core'

const scenes = [
  { id: 'main', name: 'Main Stage', sources: 4 },
  { id: 'starting', name: 'Starting Soon', sources: 2 },
  { id: 'break', name: 'Be Right Back', sources: 3 },
]

const statusCopy: Record<StreamStatus, string> = {
  Disconnected: 'Connect YouTube to prepare a broadcast.',
  Preparing: 'Preparing broadcast details...',
  Connecting: 'Connecting to YouTube...',
  Streaming: 'Stream is live.',
  Reconnecting: 'Trying to reconnect...',
  Stopped: 'Stream stopped.',
  Error: 'Streaming needs attention.',
}

export default function App() {
  const [activeScene, setActiveScene] = useState('main')
  const [streamStatus, setStreamStatus] = useState<StreamStatus>(initialStudioSnapshot.streamStatus)
  const activeSceneName = scenes.find((scene) => scene.id === activeScene)?.name ?? 'Main Stage'
  const isStreaming = streamStatus === 'Streaming'
  const isPreparing = streamStatus === 'Preparing'

  const handleStreamPress = () => {
    if (isStreaming) {
      setStreamStatus('Stopped')
      return
    }
    setStreamStatus('Preparing')
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}><Text style={styles.brandMarkText}>S</Text></View>
            <View><Text style={styles.brand}>SIGNAL</Text><Text style={styles.brandSub}>LIVE STUDIO</Text></View>
          </View>
          <View style={styles.connectedPill}><View style={styles.statusDot} /><Text style={styles.connectedText}>OFFLINE</Text></View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.kicker}>MOBILE CONTROL ROOM</Text>
          <Text style={styles.title}>Your broadcast, in your hand.</Text>
          <Text style={styles.subtitle}>Monitor scenes and prepare your YouTube stream from anywhere.</Text>
        </View>

        <View style={styles.previewCard}>
          <View style={styles.previewGrid} />
          <View style={styles.previewMessage}><Text style={styles.previewSymbol}>◈</Text><Text style={styles.previewTitle}>{activeSceneName}</Text><Text style={styles.previewText}>Preview becomes available when a capture source is connected.</Text></View>
          <View style={styles.previewFooter}><Text style={styles.previewMeta}>1920 × 1080</Text><Text style={styles.previewMeta}>30 FPS</Text></View>
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>SCENES</Text><Text style={styles.sectionHint}>Select a scene</Text></View>
        <View style={styles.sceneList}>{scenes.map((scene) => <Pressable key={scene.id} onPress={() => setActiveScene(scene.id)} style={[styles.sceneRow, activeScene === scene.id && styles.sceneRowActive]}><View style={styles.sceneIcon}><Text style={styles.sceneIconText}>▦</Text></View><View style={styles.sceneInfo}><Text style={styles.sceneName}>{scene.name}</Text><Text style={styles.sceneSources}>{scene.sources} sources</Text></View>{activeScene === scene.id && <View style={styles.activeMark} />}</Pressable>)}</View>

        <View style={styles.statusCard}><View style={styles.statusCardHeader}><Text style={styles.sectionTitle}>BROADCAST STATUS</Text><View style={styles.statusBadge}><View style={[styles.statusDot, isStreaming && styles.liveDot]} /><Text style={styles.statusBadgeText}>{streamStatus.toUpperCase()}</Text></View></View><Text style={styles.statusMessage}>{statusCopy[streamStatus]}</Text><Pressable onPress={handleStreamPress} disabled={isPreparing} style={[styles.streamButton, isStreaming && styles.stopButton, isPreparing && styles.disabledButton]}><Text style={styles.streamButtonText}>{isStreaming ? 'Stop stream' : isPreparing ? 'Preparing...' : 'Start stream'}</Text></Pressable></View>

        <View style={styles.infoRow}><View style={styles.infoBlock}><Text style={styles.infoLabel}>DESTINATION</Text><Text style={styles.infoValue}>YouTube Live</Text></View><View style={styles.infoBlock}><Text style={styles.infoLabel}>AUDIO</Text><Text style={styles.infoValue}>Not connected</Text></View></View>
        <Text style={styles.disclaimer}>Native capture and live transport will be enabled in later phases after device testing.</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#101516' },
  content: { padding: 22, paddingBottom: 38 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 35 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, backgroundColor: '#65d1b7' },
  brandMarkText: { color: '#10201d', fontSize: 18, fontWeight: '800' },
  brand: { color: '#eff4f1', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  brandSub: { color: '#74827e', fontSize: 8, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 },
  connectedPill: { flexDirection: 'row', alignItems: 'center', gap: 7, borderColor: '#344140', borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#82908b' },
  liveDot: { backgroundColor: '#65d1b7' },
  connectedText: { color: '#84928e', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  hero: { marginBottom: 21 },
  kicker: { color: '#6fd2ba', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 9 },
  title: { color: '#f0f4f1', fontSize: 29, fontWeight: '800', lineHeight: 35, maxWidth: 310 },
  subtitle: { color: '#8c9995', fontSize: 13, lineHeight: 20, marginTop: 10, maxWidth: 320 },
  previewCard: { aspectRatio: 1.55, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderColor: '#3c4c4a', borderWidth: 1, borderRadius: 12, backgroundColor: '#192222', marginBottom: 27 },
  previewGrid: { ...StyleSheet.absoluteFillObject, opacity: 0.28, backgroundColor: '#1c2b2b' },
  previewMessage: { alignItems: 'center', paddingHorizontal: 30 },
  previewSymbol: { color: '#72d3ba', fontSize: 28, marginBottom: 9 },
  previewTitle: { color: '#d9e3df', fontSize: 15, fontWeight: '700' },
  previewText: { color: '#81908b', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 7 },
  previewFooter: { position: 'absolute', right: 12, bottom: 10, flexDirection: 'row', gap: 7 },
  previewMeta: { color: '#96a39e', backgroundColor: '#26302f', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 5, fontSize: 9 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  sectionTitle: { color: '#b3c0ba', fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  sectionHint: { color: '#65726e', fontSize: 11 },
  sceneList: { gap: 8, marginBottom: 27 },
  sceneRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 9, padding: 10, backgroundColor: '#192021' },
  sceneRowActive: { borderColor: '#3d6d62', borderWidth: 1, backgroundColor: '#20312f' },
  sceneIcon: { alignItems: 'center', justifyContent: 'center', width: 41, height: 32, borderRadius: 6, backgroundColor: '#29413d' },
  sceneIconText: { color: '#7bd6bf', fontSize: 18 },
  sceneInfo: { flex: 1, marginLeft: 11 },
  sceneName: { color: '#dce5e1', fontSize: 13, fontWeight: '700' },
  sceneSources: { color: '#788580', fontSize: 10, marginTop: 3 },
  activeMark: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#6bd3b9', marginRight: 5 },
  statusCard: { borderColor: '#303d3b', borderWidth: 1, borderRadius: 11, padding: 16, backgroundColor: '#1a2222', marginBottom: 18 },
  statusCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusBadgeText: { color: '#84918c', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  statusMessage: { color: '#899691', fontSize: 12, marginTop: 14, marginBottom: 15 },
  streamButton: { alignItems: 'center', borderRadius: 7, paddingVertical: 12, backgroundColor: '#6bd3b9' },
  stopButton: { backgroundColor: '#e79279' },
  disabledButton: { opacity: 0.55 },
  streamButtonText: { color: '#14201d', fontSize: 12, fontWeight: '800' },
  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 19 },
  infoBlock: { flex: 1, borderColor: '#2d3938', borderWidth: 1, borderRadius: 8, padding: 12, backgroundColor: '#171e1f' },
  infoLabel: { color: '#687671', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  infoValue: { color: '#c8d3ce', fontSize: 12, fontWeight: '600', marginTop: 7 },
  disclaimer: { color: '#64726e', fontSize: 10, lineHeight: 15, textAlign: 'center', paddingHorizontal: 18 },
})