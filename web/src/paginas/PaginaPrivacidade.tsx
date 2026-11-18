// Política de privacidade (LGPD — Lei nº 13.709/2018), em linguagem simples.
export function PaginaPrivacidade() {
  return (
    <div className="pagina-texto pagina-estreita texto-corrido">
      <h1>Política de privacidade</h1>
      <p className="cartao-sub">Versão de demonstração do projeto acadêmico RotaCerta (Facens, 2026).</p>

      <h2>O que guardamos</h2>
      <ul>
        <li><strong>Sem conta:</strong> nada no servidor. Favoritos e preferências de leitura ficam só no seu navegador.</li>
        <li><strong>Com conta:</strong> nome, e-mail, senha (em forma de hash, que não pode ser revertida), favoritos, preferências de leitura e a data em que você aceitou esta política.</li>
      </ul>

      <h2>O que não guardamos</h2>
      <ul>
        <li>Sua localização. O recurso "ponto mais próximo de mim" faz a conta no seu próprio navegador; a posição não é enviada ao servidor.</li>
        <li>Seu histórico de buscas e de trajetos planejados.</li>
      </ul>

      <h2>Para que usamos</h2>
      <p>Só para fazer o RotaCerta funcionar: entrar na conta, mostrar seus favoritos e os avisos das suas linhas. Não compartilhamos seus dados com ninguém.</p>

      <h2>Seus direitos</h2>
      <p>
        Em <strong>Minha conta</strong> você pode baixar uma cópia dos seus dados e excluir a conta a qualquer momento.
        A exclusão apaga todos os seus dados imediatamente.
      </p>

      <h2>Cookies</h2>
      <p>Usamos um único cookie, necessário para manter você conectado. Ele não serve para rastreamento nem publicidade.</p>
    </div>
  );
}
