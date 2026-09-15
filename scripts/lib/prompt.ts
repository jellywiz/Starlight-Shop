import readline from 'node:readline'

/** Reads a secret from the terminal without echoing it. */
export function readSecret(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(
        new Error(
          'No terminal available for a prompt; set the value through an environment variable instead.',
        ),
      )
      return
    }
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    })
    const output = process.stdout as NodeJS.WriteStream & { muted?: boolean }
    const write = output.write.bind(output)
    process.stdout.write(question)
    // Mute echo after the prompt is printed.
    output.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
      if (typeof chunk === 'string' && chunk !== '\n' && chunk !== '\r\n') {
        return true
      }
      return (write as unknown as (c: string | Uint8Array, ...r: unknown[]) => boolean)(
        chunk,
        ...rest,
      )
    }) as typeof output.write
    rl.question('', (answer) => {
      output.write = write
      process.stdout.write('\n')
      rl.close()
      resolve(answer)
    })
  })
}
