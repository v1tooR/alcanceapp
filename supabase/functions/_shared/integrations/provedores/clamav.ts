import type { ProvedorAntivirus } from '../tipos.ts'

/**
 * ClamAV via protocolo clamd (TCP), comando INSTREAM.
 * Serviço opcional do docker compose: `docker compose --profile antivirus up -d`.
 */
export function criarClamAv(): ProvedorAntivirus {
  const hostname = Deno.env.get('CLAMAV_HOST') ?? 'clamav'
  const port = Number(Deno.env.get('CLAMAV_PORT') ?? 3310)

  async function conversar(escrever: (conexao: Deno.Conn) => Promise<void>): Promise<string> {
    const conexao = await Deno.connect({ hostname, port })
    try {
      await escrever(conexao)
      const partes: Uint8Array[] = []
      const buffer = new Uint8Array(1024)
      while (true) {
        const lidos = await conexao.read(buffer)
        if (lidos === null) break
        partes.push(buffer.slice(0, lidos))
        if (buffer[lidos - 1] === 0) break
      }
      return new TextDecoder().decode(new Uint8Array(partes.flatMap((parte) => [...parte]))).replace(/\0/g, '').trim()
    } finally {
      conexao.close()
    }
  }

  return {
    async verificar(conteudo) {
      const resposta = await conversar(async (conexao) => {
        await conexao.write(new TextEncoder().encode('zINSTREAM\0'))
        const tamanhoBloco = 64 * 1024
        for (let inicio = 0; inicio < conteudo.length; inicio += tamanhoBloco) {
          const bloco = conteudo.subarray(inicio, inicio + tamanhoBloco)
          const cabecalho = new Uint8Array(4)
          new DataView(cabecalho.buffer).setUint32(0, bloco.length)
          await conexao.write(cabecalho)
          await conexao.write(bloco)
        }
        await conexao.write(new Uint8Array(4))
      })
      // "stream: OK" ou "stream: <Assinatura> FOUND"
      if (resposta.endsWith('OK')) return { limpo: true }
      const encontrada = resposta.match(/stream: (.+) FOUND/)
      if (encontrada) return { limpo: false, assinatura: encontrada[1] }
      throw new Error(`Resposta inesperada do ClamAV: ${resposta}`)
    },

    async situacao() {
      try {
        const resposta = await conversar((conexao) => conexao.write(new TextEncoder().encode('zPING\0')).then(() => {}))
        return resposta === 'PONG'
          ? { disponivel: true, detalhe: `ClamAV respondendo em ${hostname}:${port}.` }
          : { disponivel: false, detalhe: `Resposta inesperada de ${hostname}:${port}.` }
      } catch {
        return { disponivel: false, detalhe: `ClamAV inacessível em ${hostname}:${port}. Suba o perfil "antivirus" do docker compose.` }
      }
    },
  }
}
