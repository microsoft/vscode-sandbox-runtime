/**
 * End-to-end: run srt in an unprivileged container with
 * enableWeakerNestedSandbox and verify the sandbox enforces.
 *
 * Gated on SRT_E2E_DOCKER so `npm test` on the host jobs skips it —
 * it's designed for a container that lacks CAP_SYS_ADMIN.
 *
 * Invoked by CI via:
 *   docker run --rm \
 *     --security-opt seccomp=unconfined --security-opt apparmor=unconfined \
 *     -v "$PWD:/work" -w /work -e SRT_E2E_DOCKER=1 \
 *     ubuntu:24.04 bash -c '<setup> && bun test test/e2e/docker.test.ts'
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const inDocker = process.env.SRT_E2E_DOCKER === '1'

describe.if(inDocker)('srt end-to-end in unprivileged container', () => {
  const WORK = join(tmpdir(), `srt-e2e-${Date.now()}`)
  const ALLOWED = join(WORK, 'allowed')
  const DENIED = join(WORK, 'denied')
  const CONFIG = join(WORK, 'srt.json')

  const srt = (cmd: string) =>
    spawnSync('node', ['dist/cli.js', '-s', CONFIG, '-c', cmd], {
      encoding: 'utf8',
      timeout: 15000,
    })

  beforeAll(() => {
    mkdirSync(ALLOWED, { recursive: true })
    mkdirSync(DENIED, { recursive: true })
    writeFileSync(
      CONFIG,
      JSON.stringify({
        network: { allowedDomains: [], deniedDomains: [] },
        filesystem: {
          denyRead: [],
          allowWrite: [ALLOWED],
          denyWrite: [],
        },
        enableWeakerNestedSandbox: true,
      }),
    )
  })

  afterAll(() => {
    rmSync(WORK, { recursive: true, force: true })
  })

  it('writes to allowWrite dir', () => {
    const out = join(ALLOWED, 'out')
    const r = srt(`echo ok > ${out}`)
    expect(r.status).toBe(0)
    expect(readFileSync(out, 'utf8').trim()).toBe('ok')
  })

  it('blocks write outside allowWrite', () => {
    const out = join(DENIED, 'out')
    const r = srt(`echo bad > ${out}`)
    expect(r.status).not.toBe(0)
    expect(existsSync(out)).toBe(false)
  })

  it('seccomp blocks AF_UNIX socket creation', () => {
    const r = srt('python3 -c "import socket; socket.socket(socket.AF_UNIX)"')
    expect(r.status).not.toBe(0)
    expect(r.stderr.toLowerCase()).toMatch(
      /permission denied|operation not permitted/,
    )
  })

  it('seccomp allows AF_INET socket creation', () => {
    const r = srt('python3 -c "import socket; socket.socket(socket.AF_INET)"')
    expect(r.status).toBe(0)
  })
})
