// RF08 — Quem está logado. A sessão vive num cookie httpOnly que o JavaScript
// não consegue ler; por isso perguntamos à API (/auth/eu) ao abrir o site.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type Usuario } from '../api';

interface ValorSessao {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<Usuario>;
  cadastrar: (dados: { nome: string; email: string; senha: string; aceite: boolean }) => Promise<Usuario>;
  sair: () => Promise<void>;
  excluirConta: () => Promise<void>;
  atualizarUsuario: (u: Usuario) => void;
}

const Contexto = createContext<ValorSessao | null>(null);

export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.eu().then((r) => setUsuario(r.usuario)).catch(() => {}).finally(() => setCarregando(false));
  }, []);

  const entrar = useCallback(async (email: string, senha: string) => {
    const { usuario } = await api.entrar(email, senha);
    setUsuario(usuario);
    return usuario;
  }, []);

  const cadastrar = useCallback(async (dados: Parameters<ValorSessao['cadastrar']>[0]) => {
    const { usuario } = await api.cadastrar(dados);
    setUsuario(usuario);
    return usuario;
  }, []);

  const sair = useCallback(async () => {
    await api.sair();
    setUsuario(null);
  }, []);

  const excluirConta = useCallback(async () => {
    await api.excluirConta();
    setUsuario(null);
  }, []);

  return (
    <Contexto.Provider value={{ usuario, carregando, entrar, cadastrar, sair, excluirConta, atualizarUsuario: setUsuario }}>
      {children}
    </Contexto.Provider>
  );
}

export function useSessao() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useSessao precisa estar dentro de ProvedorSessao');
  return ctx;
}
