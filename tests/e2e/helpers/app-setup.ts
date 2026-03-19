import { resolve } from 'path'
import { spawn, type ChildProcess } from 'child_process'
import { chromium, type Browser, type Page } from '@playwright/test'
import { createRequire } from 'module'

let electronProcess: ChildProcess | null = null
let browser: Browser | null = null

function waitForDebuggerUrl(proc: ChildProcess, timeout = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    let stderrLog = ''

    const timer = setTimeout(() => {
      reject(
        new Error(
          `Timed out waiting for DevTools URL on stderr after ${timeout}ms\n\nStderr log:\n${stderrLog}`
        )
      )
    }, timeout)

    proc.stdout?.on('data', (d) => console.log('ELECTRON STDOUT:', d.toString()))

    const onData = (data: Buffer): void => {
      const line = data.toString()
      console.log('ELECTRON STDERR:', line)
      stderrLog += line
      const match = line.match(/DevTools listening on (ws:\/\/[^\s]+)/)
      if (match) {
        clearTimeout(timer)
        proc.stderr?.off('data', onData)
        resolve(match[1])
      }
    }

    proc.stderr?.on('data', onData)
    proc.on('exit', (code) => {
      clearTimeout(timer)
      reject(
        new Error(
          `Electron exited with code ${code} before DevTools URL was emitted.\n\nStderr log:\n${stderrLog}`
        )
      )
    })
  })
}

export async function launchApp(): Promise<{ browser: Browser; page: Page }> {
  // Pass '.' to electron so it reads package.json and initializes the app context correctly
  const mainEntry = resolve(process.cwd(), '.')

  // Resolve the exact electron binary from node_modules using createRequire for pnpm
  const req = createRequire(resolve(__dirname, '../../../package.json'))
  const electronPath = req('electron') as unknown as string

  // Strip ELECTRON_RUN_AS_NODE from env so it doesn't run as a raw Node process
  const childEnv = { ...process.env, NODE_ENV: 'test' }
  delete childEnv.ELECTRON_RUN_AS_NODE

  // Spawn electron manually
  electronProcess = spawn(electronPath, [mainEntry], {
    env: childEnv,
    stdio: ['pipe', 'pipe', 'pipe']
  })

  // Wait for the DevTools ws URL from stderr
  const wsUrl = await waitForDebuggerUrl(electronProcess)

  // Extract the base URL from the ws URL for connectOverCDP
  const parsedUrl = new URL(wsUrl)
  const cdpUrl = `http://${parsedUrl.host}`

  // Connect Playwright to the running Electron via CDP
  browser = await chromium.connectOverCDP(cdpUrl)

  // Get the first page (main window)
  const contexts = browser.contexts()
  let page: Page

  if (contexts.length > 0 && contexts[0].pages().length > 0) {
    page = contexts[0].pages()[0]
  } else {
    // Wait for a page to appear
    const ctx = contexts[0] || (await browser.newContext())
    page = await ctx.waitForEvent('page', { timeout: 10000 })
  }

  // Wait for the app to fully load
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 })

  return { browser, page }
}

export async function teardownApp(): Promise<void> {
  if (browser) {
    await browser.close().catch(() => {})
    browser = null
  }
  if (electronProcess) {
    electronProcess.kill()
    const proc = electronProcess
    setTimeout(() => {
      try {
        if (!proc.killed) proc.kill('SIGKILL')
      } catch {
        /* ignore */
      }
    }, 2000)
    electronProcess = null
  }
}
