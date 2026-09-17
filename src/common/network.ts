export interface NetworkAddress {
  interface: string
  address: string
}

const LINK_LOCAL = /^169\.254\./
// 100.64.0.0/10 — carrier NAT, and what Tailscale hands out
const CGNAT = /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./
const PRIVATE_192 = /^192\.168\./
const PRIVATE_10 = /^10\./
const PRIVATE_172 = /^172\.(1[6-9]|2\d|3[01])\./

// VPNs, containers, VM bridges and Apple's peer-to-peer links. `feth` is macOS' fake ethernet,
// which shows up on private ranges and would otherwise outrank the real interface.
const VIRTUAL_INTERFACE = /^(utun|tun\d|tap\d|ppp|wg\d|zt|tailscale|docker|br-|bridge|veth|virbr|vmnet|vboxnet|vethernet|feth|awdl|llw|anpi|ap\d|bluetooth)/i
const PHYSICAL_INTERFACE = /^(en\d|eth\d|wlan\d|wlp|enp|eno|ens|wi-?fi|ethernet|local area connection)/i

/**
 * How likely this address is to be the one a phone on the same network can reach.
 * Higher is better. Ranks on the interface name first: a machine can easily have several
 * addresses in private ranges where only one of them is the real LAN.
 */
export function scoreNetworkAddress(entry: NetworkAddress): number {
  let score = 0

  if (LINK_LOCAL.test(entry.address)) score -= 1000
  if (CGNAT.test(entry.address)) score -= 200
  if (VIRTUAL_INTERFACE.test(entry.interface)) score -= 100

  if (PRIVATE_192.test(entry.address)) score += 40
  else if (PRIVATE_10.test(entry.address)) score += 30
  else if (PRIVATE_172.test(entry.address)) score += 20
  else score -= 20

  if (PHYSICAL_INTERFACE.test(entry.interface)) score += 10

  return score
}

// Best first. Sorting is stable, so equally scored addresses keep the order the OS reported them in
export function sortAddressesByLanLikelihood(addresses: NetworkAddress[]): NetworkAddress[] {
  return [...addresses].sort((a, b) => scoreNetworkAddress(b) - scoreNetworkAddress(a))
}

export function pickBestAddress(addresses: NetworkAddress[]): NetworkAddress | null {
  return sortAddressesByLanLikelihood(addresses)[0] ?? null
}

export function buildOrigin(address: string, port: number | string): string {
  const host = address.includes(':') ? `[${address}]` : address
  return `http://${host}:${port}`
}

export function remoteControlPath(): string {
  return '/remote#/'
}

export function countdownPath(timerId: string, windowId?: string): string {
  return `/remote#/countdown/${timerId}${windowId ? `/${windowId}` : ''}`
}

export function buildUrl(origin: string, path: string): string {
  return `${origin.replace(/\/$/, '')}${path}`
}
