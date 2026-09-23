import os from 'node:os'
import {Bonjour, type Service} from 'bonjour-service'

export interface DiscoveryInput {
  enabled: boolean
  version: string
  http: {running: boolean, port: number}
  osc: {running: boolean, port: number}
}

export interface ServiceSpec {
  name: string
  type: string
  protocol: 'tcp' | 'udp'
  port: number
  txt: {[key: string]: string}
}

export function discoveryName(hostname: string = os.hostname()): string {
  return `Countdown (${hostname.replace(/\.local\.?$/, '')})`
}

export function desiredServices(input: DiscoveryInput): ServiceSpec[] {
  if (!input.enabled) return []

  const name = discoveryName()
  const services: ServiceSpec[] = []

  if (input.http.running) {
    services.push({
      name,
      type: 'countdown',
      protocol: 'tcp',
      port: input.http.port,
      txt: {version: input.version, remote: '/remote', ws: '/ws'},
    })
    services.push({name, type: 'http', protocol: 'tcp', port: input.http.port, txt: {path: '/remote'}})
  }

  if (input.osc.running) {
    services.push({name, type: 'osc', protocol: 'udp', port: input.osc.port, txt: {version: input.version}})
  }

  return services
}

function specKey(spec: ServiceSpec): string {
  return JSON.stringify([spec.name, spec.type, spec.protocol, spec.port, spec.txt])
}

export class Discovery {
  private bonjour: Bonjour = null
  private published = new Map<string, Service>()

  refresh(input: DiscoveryInput) {
    try {
      const wanted = new Map(desiredServices(input).map(spec => [specKey(spec), spec]))

      for (const [key, service] of this.published) {
        if (wanted.has(key)) continue
        service.stop()
        this.published.delete(key)
      }

      if (wanted.size === 0) return

      this.bonjour ??= new Bonjour(undefined, (err: Error) => console.log('DNS-SD error', err))

      for (const [key, spec] of wanted) {
        if (this.published.has(key)) continue
        this.published.set(key, this.bonjour.publish(spec))
      }
    } catch (err) {
      console.log('DNS-SD refresh failed', err)
    }
  }

  stop(): Promise<void> {
    if (!this.bonjour) return Promise.resolve()

    return new Promise(resolve => {
      try {
        this.bonjour.unpublishAll(() => {
          this.destroy()
          resolve()
        })
      } catch (err) {
        console.log('DNS-SD stop failed', err)
        this.destroy()
        resolve()
      }
    })
  }

  private destroy() {
    this.published.clear()
    this.bonjour?.destroy()
    this.bonjour = null
  }
}
