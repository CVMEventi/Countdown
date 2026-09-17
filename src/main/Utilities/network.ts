import os from 'node:os'
import {NetworkAddress, sortAddressesByLanLikelihood} from '@common/network.ts'

/**
 * Every non-internal IPv4 address of this machine, most likely to be reachable from another
 * device on the same network first. Loopback is deliberately not included: this is a report of
 * real interfaces, and the UI adds its own 127.0.0.1 fallback entry.
 */
export function listLocalIPv4Addresses(): NetworkAddress[] {
  const found: NetworkAddress[] = []

  for (const [name, infos] of Object.entries(os.networkInterfaces())) {
    for (const info of infos ?? []) {
      if (info.internal) continue
      // Node 20 reports the string, older releases the number
      if (info.family !== 'IPv4' && (info.family as unknown as number) !== 4) continue
      found.push({ interface: name, address: info.address })
    }
  }

  return sortAddressesByLanLikelihood(found)
}
