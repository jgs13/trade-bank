# Trade Bank — WIN B3

Aplicativo PWA para controle pessoal de operações de mini índice WIN.

## Tecnologias
- React + Vite
- Firebase Authentication (e-mail e senha)
- Cloud Firestore
- PWA com manifest e service worker

## Desenvolvimento
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

No Vercel, use preset Vite, comando `npm run build` e diretório `dist`.

A configuração Firebase do cliente fica em `src/firebase.js`. O acesso aos dados é limitado pelas regras do Firestore ao UID autenticado.
