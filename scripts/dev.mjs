// Dev launcher: khởi động server TRƯỚC, rồi mới tới client sau vài giây.
// Lý do: trên Windows, nếu Vite (esbuild ngốn CPU) khởi động cùng lúc, `tsx watch`
// của server không kịp spawn → cổng 3000/1234 không bao giờ lên. Cho server chạy
// trước vài giây để né race condition này.
import { spawn } from 'node:child_process'

const CLIENT_DELAY_MS = 4000
const opts = { stdio: 'inherit', shell: true }

function run(name, args) {
  const child = spawn('pnpm', ['--filter', name, 'dev'], opts)
  child.on('exit', (code) => {
    console.log(`[${name}] exited with code ${code}`)
  })
  return child
}

console.log('Starting server...')
run('server')

setTimeout(() => {
  console.log(`Starting client (after ${CLIENT_DELAY_MS}ms)...`)
  run('client')
}, CLIENT_DELAY_MS)
