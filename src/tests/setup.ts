import '@testing-library/jest-dom/vitest'

// `matchMedia` não existe no jsdom, mas é usado pelo controle de tema e pelas
// animações que respeitam movimento reduzido.
if (!window.matchMedia) {
  window.matchMedia = ((consulta: string) => ({
    matches: false,
    media: consulta,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

// O jsdom substitui `AbortController`, mas o `Request` nativo do Node só aceita
// o `AbortSignal` dele próprio. O React Router cria um `Request` a cada
// navegação e quebraria nos testes. Só no ambiente de teste, descartamos o
// sinal — cancelamento de navegação não é o que estes testes verificam.
const RequestNativo = globalThis.Request
globalThis.Request = class RequestDeTeste extends RequestNativo {
  constructor(entrada: RequestInfo | URL, opcoes?: RequestInit) {
    if (opcoes?.signal) {
      const { signal: _sinal, ...resto } = opcoes
      super(entrada, resto)
    } else {
      super(entrada, opcoes)
    }
  }
} as typeof Request
