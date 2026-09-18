<template>
  <div class="p-4 text-white bg-zinc-900 h-full text-sm">
    <p>Countdown web remote host</p>
    <p class="text-zinc-400">{{ state }}</p>
  </div>
</template>

<script lang="ts" setup>
import {onMounted, onUnmounted, ref} from 'vue'
import {PeerHost} from '../webrtc/PeerHost.ts'
import type {PeerHostSession} from '../webrtc/PeerHost.ts'
import {DEFAULT_WEBRTC_ICE_SERVERS, DEFAULT_WEBRTC_SIGNALING} from '../../common/config.ts'
import type {RemoteSettings} from '../../common/config.ts'

const {api, webrtcHost} = window as unknown as {api: any, webrtcHost: any}

defineOptions({name: 'WebRtcHost'})

const state = ref('starting')
let host: PeerHost | null = null

onMounted(async () => {
  const settings = await api.getSettings()
  const remote: RemoteSettings = settings.remote
  const session: PeerHostSession | null = await webrtcHost.getSession()

  if (!session) {
    state.value = 'no session'
    return
  }

  host = new PeerHost({
    session,
    signaling: remote.webrtcSignaling ?? DEFAULT_WEBRTC_SIGNALING,
    iceServers: remote.webrtcIceServers ?? DEFAULT_WEBRTC_ICE_SERVERS,
    iceTransportPolicy: remote.webrtcIceTransportPolicy ?? 'all',
    onStatus: (next, lastError) => {
      state.value = next
      webrtcHost.reportStatus(next, lastError)
    },
    onClients: clients => webrtcHost.reportClients(clients),
    onCommand: command => webrtcHost.sendCommand(command),
    getSnapshot: () => webrtcHost.getSnapshot(),
    requireApproval: remote.webrtcRequireApproval ?? false,
    onApprovalRequest: (clientId, name) => webrtcHost.requestApproval(clientId, name),
    getAudio: (timerId, haveRevision) => webrtcHost.getAudio(timerId, haveRevision),
  })

  webrtcHost.onSession((_event: unknown, session: PeerHostSession) => host?.setSession(session))
  webrtcHost.onBroadcast((_event: unknown, update: unknown) => host?.broadcast(update))
  webrtcHost.onRevoke((_event: unknown, clientId: string) => host?.revoke(clientId))

  host.start()
})

onUnmounted(() => host?.stop())
</script>
