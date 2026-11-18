// Testes de integração: sobem a API de verdade numa porta livre e fazem
// requisições HTTP, como o navegador faria.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { criarApp } from './app.js';
import { CONTA_DEMO } from './db/migracoes.js';

let servidor: Server;
let base: string;

beforeAll(async () => {
  servidor = criarApp().listen(0);
  await new Promise((ok) => servidor.once('listening', ok));
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/api`;
});
afterAll(() => servidor.close());

/** Cliente mínimo que guarda o cookie de sessão entre chamadas, como um navegador. */
function cliente() {
  let cookie = '';
  return async (metodo: string, caminho: string, corpo?: unknown, cabecalhos: Record<string, string> = {}) => {
    const r = await fetch(base + caminho, {
      method: metodo,
      headers: { 'content-type': 'application/json', cookie, ...cabecalhos },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const setCookie = r.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const texto = await r.text();
    return { status: r.status, corpo: texto ? JSON.parse(texto) : null, setCookie };
  };
}

describe('contas (RF08)', () => {
  it('a conta de demonstração já existe e entra com a senha padrão', async () => {
    const api = cliente();
    const r = await api('POST', '/auth/login', { email: CONTA_DEMO.email, senha: CONTA_DEMO.senha });
    expect(r.status).toBe(200);
    expect(r.corpo.usuario.email).toBe(CONTA_DEMO.email);
    expect(r.setCookie).toMatch(/HttpOnly/i);
    expect((await api('GET', '/favoritos')).corpo).toHaveLength(2); // favoritos de exemplo
  });

  it('cadastra, mantém a sessão e sai', async () => {
    const api = cliente();
    const cad = await api('POST', '/auth/cadastro', { nome: 'Marcos', email: 'Marcos@Teste.com', senha: 'senha-forte-1', aceite: true });
    expect(cad.status).toBe(201);
    expect(cad.corpo.usuario.email).toBe('marcos@teste.com'); // e-mail normalizado
    expect((await api('GET', '/auth/eu')).corpo.usuario.nome).toBe('Marcos');
    await api('POST', '/auth/logout');
    expect((await api('GET', '/auth/eu')).corpo.usuario).toBeNull();
  });

  it('recusa cadastro sem aceite da política, senha curta e e-mail repetido', async () => {
    const api = cliente();
    expect((await api('POST', '/auth/cadastro', { nome: 'A B', email: 'x@y.com', senha: '12345678', aceite: false })).status).toBe(400);
    expect((await api('POST', '/auth/cadastro', { nome: 'A B', email: 'x@y.com', senha: '123', aceite: true })).status).toBe(400);
    expect((await api('POST', '/auth/cadastro', { nome: 'A B', email: CONTA_DEMO.email, senha: '12345678', aceite: true })).status).toBe(409);
  });

  it('não revela se o e-mail existe e bloqueia após 5 tentativas erradas', async () => {
    const api = cliente();
    const inexistente = await api('POST', '/auth/login', { email: 'ninguem@x.com', senha: 'qualquer' });
    const senhaErrada = await api('POST', '/auth/login', { email: CONTA_DEMO.email, senha: 'errada' });
    expect(inexistente.corpo.erro).toBe(senhaErrada.corpo.erro);

    for (let i = 0; i < 4; i++) await api('POST', '/auth/login', { email: CONTA_DEMO.email, senha: 'errada' });
    const bloqueado = await api('POST', '/auth/login', { email: CONTA_DEMO.email, senha: CONTA_DEMO.senha });
    expect(bloqueado.status).toBe(429);
  });

  it('exclui a conta e os dados junto (LGPD)', async () => {
    const api = cliente();
    await api('POST', '/auth/cadastro', { nome: 'Camila', email: 'camila@teste.com', senha: 'outra-senha', aceite: true });
    await api('PUT', '/favoritos/linha/1');
    const dados = await api('GET', '/auth/meus-dados');
    expect(dados.corpo.favoritos).toHaveLength(1);
    expect((await api('DELETE', '/auth/conta')).status).toBe(204);
    expect((await api('GET', '/auth/eu')).corpo.usuario).toBeNull();
    const deNovo = await api('POST', '/auth/login', { email: 'camila@teste.com', senha: 'outra-senha' });
    expect(deNovo.status).toBe(401);
  });
});

describe('favoritos (RF06)', () => {
  it('exige login', async () => {
    expect((await cliente()('GET', '/favoritos')).status).toBe(401);
  });

  it('adiciona, ignora repetidos, importa do navegador e remove', async () => {
    const api = cliente();
    await api('POST', '/auth/cadastro', { nome: 'Helena', email: 'helena@teste.com', senha: 'senha-helena', aceite: true });
    await api('PUT', '/favoritos/ponto/8');
    const r = await api('PUT', '/favoritos/ponto/8');
    expect(r.corpo).toEqual([{ tipo: 'ponto', id: 8 }]);
    const imp = await api('POST', '/favoritos/importar', { itens: [{ tipo: 'linha', id: 2 }, { tipo: 'ponto', id: 8 }, { tipo: 'linha', id: 999 }] });
    expect(imp.corpo).toHaveLength(2); // repetido e inexistente ficam de fora
    expect((await api('DELETE', '/favoritos/ponto/8')).corpo).toEqual([{ tipo: 'linha', id: 2 }]);
  });
});
